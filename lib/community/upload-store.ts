import { submitCommunityVideo } from "@/action/community.action";
import { isEpisodic, type CommunityCategory, type CommunityGenre } from "./types";

/**
 * Community uploads, app-wide (browser only).
 *
 * The upload lives here — not in the /community/upload page — so it keeps going
 * while the member browses the rest of the app; it only stops if the tab is
 * closed. Its state (progress, the form's draft, the submission) is mirrored in
 * localStorage, so pages show the same thing after any navigation, and a tab
 * closed mid-upload is reported as "interrupted" (picking the same file again
 * resumes it where it stopped: the pieces already sent stay on the server 24 h).
 * The server → upload-server step continues by itself and is followed again on return.
 *
 * Tiny Zustand-like store, read with useSyncExternalStore (hooks/use-community-upload.ts).
 */

export interface ServerFile {
  fileCode: string;
  embedUrl: string;
  thumbnail: string | null;
  durationSec: number | null;
  canPlay: boolean;
}

interface Draft {
  category: CommunityCategory;
  seriesTitle: string;
  season: number;
  episode: number;
  title: string;
  description: string;
  year: string;
  language: string;
  genres: CommunityGenre[];
  cast: string;
  posterData: string | null;
  posterUrl: string;
}

const EMPTY_DRAFT: Draft = {
  category: "movie",
  seriesTitle: "",
  season: 1,
  episode: 1,
  title: "",
  description: "",
  year: "",
  language: "",
  genres: [],
  cast: "",
  posterData: null,
  posterUrl: "",
};

export type UploadErrorCode = "UPLOAD_FAILED" | "TRANSFER_FAILED" | "NOT_VIDEO" | "TOO_LARGE" | "RATE_LIMITED";

export type UploadState =
  | { status: "idle" }
  | {
      status: "uploading";
      name: string;
      size: number;
      progress: number;
      /** Bytes sent, speed (bytes/s) and time left (s) — null until measurable. */
      sent: number;
      speed: number | null;
      eta: number | null;
    }
  | { status: "transferring"; name: string; size: number; transferred: number; speed: number | null }
  | { status: "uploaded"; name: string; size: number; file: ServerFile }
  | { status: "error"; code: UploadErrorCode; resumable: boolean; name?: string; size?: number }
  /** The tab was closed during the upload: the same file must be picked again to resume. */
  | { status: "interrupted"; name: string; size: number };

interface SubmissionState {
  /** queued = "submit" pressed during the upload: sent for review automatically when it ends. */
  status: "idle" | "queued" | "submitting" | "submitted" | "failed";
  id?: string;
  category?: CommunityCategory;
  title?: string;
  error?: string;
}

interface StoreState {
  upload: UploadState;
  draft: Draft;
  submission: SubmissionState;
  /** The floating widget was closed (it comes back with the next upload). */
  dismissed: boolean;
}

interface SavedSession {
  ticket: string;
  chunkSize: number;
  totalChunks: number;
  name: string;
  size: number;
  lastModified: number;
}

const KEY = "lf_community_upload_v1";
const PARALLEL = 3;
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|ts|mpg|mpeg|3gp)$/i;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const INITIAL_STATE: StoreState = {
  upload: { status: "idle" },
  draft: EMPTY_DRAFT,
  submission: { status: "idle" },
  dismissed: false,
};

let state: StoreState = INITIAL_STATE;
let session: (SavedSession & { file: File | null }) | null = null;
let loaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const xhrs = new Set<XMLHttpRequest>();
let runId = 0; // a new upload / cancel makes older loops stop

function set(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
  if (!persistTimer) persistTimer = setTimeout(persist, 800);
}

function persist() {
  persistTimer = null;
  try {
    const draft =
      state.draft.posterData && state.draft.posterData.length > 400_000
        ? { ...state.draft, posterData: null }
        : state.draft;
    const saved = { state: { ...state, draft }, session: session && { ...session, file: undefined } };
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // storage full or unavailable: the live state still works
  }
}

/** First read in the browser: restore what the last page / tab left. */
function load() {
  loaded = true;
  if (typeof window === "undefined") return;
  let saved: { state?: StoreState; session?: SavedSession | null } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    saved = null;
  }
  if (!saved?.state) return;
  const restored = { ...INITIAL_STATE, ...saved.state, draft: { ...EMPTY_DRAFT, ...saved.state.draft } };
  session = saved.session ? { ...saved.session, file: null } : null;
  const up = restored.upload;
  // A tab closed in the middle of sending pieces: those pieces are on the server, the file isn't.
  if (up.status === "uploading") restored.upload = { status: "interrupted", name: up.name, size: up.size };
  if (restored.submission.status === "submitting") restored.submission = { status: "queued" };
  state = restored;
  // The server → upload-server step went on without us: follow it again.
  if (up.status === "transferring" && session) void followTransfer(++runId);
  if (up.status === "uploaded" && state.submission.status === "queued") void sendForReview();
}

export const uploadStore = {
  getState: () => state,
  getServerState: () => INITIAL_STATE,
  subscribe(listener: () => void) {
    if (!loaded) load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// ---------------------------------------------------------------- network --

const warnOnClose = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  e.returnValue = "";
};
/** Closing the tab during the upload stops it: the browser asks first. */
function guardTab(on: boolean) {
  if (typeof window === "undefined") return;
  window.removeEventListener("beforeunload", warnOnClose);
  if (on) window.addEventListener("beforeunload", warnOnClose);
}

async function api(path: string, method = "GET") {
  if (!session) return null;
  try {
    const res = await fetch(path, { method, headers: { "x-upload-ticket": session.ticket }, cache: "no-store" });
    return (await res.json()) as {
      ok: boolean;
      status?: string;
      received?: number[];
      transferred?: number;
      file?: ServerFile;
      error?: string;
    };
  } catch {
    return null;
  }
}

function sendPiece(index: number, onProgress: (loaded: number) => void) {
  return new Promise<boolean>((resolve) => {
    if (!session?.file) return resolve(false);
    const from = index * session.chunkSize;
    const blob = session.file.slice(from, Math.min(from + session.chunkSize, session.size));
    const xhr = new XMLHttpRequest();
    xhrs.add(xhr);
    const finish = (ok: boolean) => {
      xhrs.delete(xhr);
      resolve(ok);
    };
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => finish(xhr.status === 200);
    xhr.onerror = xhr.onabort = xhr.ontimeout = () => finish(false);
    xhr.open("PUT", `/api/community/upload/chunk?index=${index}`);
    xhr.setRequestHeader("x-upload-ticket", session.ticket);
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(blob);
  });
}

const fail = (code: UploadErrorCode, resumable = true) => {
  guardTab(false);
  set({ upload: { status: "error", code, resumable, name: session?.name, size: session?.size } });
};

/** Sends the missing pieces (3 at a time, each retried 5 times), then follows the server's transfer. */
async function sendPieces(run: number, received: number[]) {
  if (!session?.file) return;
  const s = session;
  const pieceSize = (i: number) => Math.min(s.chunkSize, s.size - i * s.chunkSize);
  const done = new Set(received);
  let sent = [...done].reduce((sum, i) => sum + pieceSize(i), 0);
  const inFlight = new Map<number, number>();
  const samples: [number, number][] = [];
  let lastPaint = 0;
  guardTab(true);

  const progress = (force = false) => {
    if (run !== runId) return;
    const now = Date.now();
    const bytes = sent + [...inFlight.values()].reduce((a, b) => a + b, 0);
    samples.push([now, bytes]);
    while (samples.length > 2 && now - samples[0][0] > 6000) samples.shift();
    if (!force && now - lastPaint < 300) return;
    lastPaint = now;
    const [t0, b0] = samples[0];
    const speed = now - t0 >= 1500 ? ((bytes - b0) * 1000) / (now - t0) : null;
    set({
      upload: {
        status: "uploading",
        name: s.name,
        size: s.size,
        progress: Math.min(100, Math.floor((bytes / s.size) * 100)),
        sent: bytes,
        speed,
        eta: speed && speed > 0 ? (s.size - bytes) / speed : null,
      },
      dismissed: false,
    });
  };
  progress(true);

  const queue = Array.from({ length: s.totalChunks }, (_, i) => i).filter((i) => !done.has(i));
  let failed = false;
  const worker = async () => {
    while (queue.length && !failed && run === runId) {
      const index = queue.shift()!;
      let ok = false;
      for (let attempt = 0; attempt < 5 && !ok && run === runId; attempt++) {
        if (attempt) await sleep(2000 * attempt);
        inFlight.set(index, 0);
        ok = await sendPiece(index, (loaded) => {
          inFlight.set(index, loaded);
          progress();
        });
      }
      inFlight.delete(index);
      if (!ok) {
        failed = true;
        break;
      }
      sent += pieceSize(index);
      progress();
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length || 1) }, worker));
  if (run !== runId) return;
  if (failed) {
    xhrs.forEach((xhr) => xhr.abort());
    return fail("UPLOAD_FAILED");
  }
  progress(true);
  guardTab(false);
  await followTransfer(run);
}

/**
 * Every piece is on the server: it reassembles them and sends the video to the
 * upload server by itself. Restarted automatically (3 times) if it fails or stalls.
 */
async function followTransfer(run: number) {
  if (!session) return;
  const { name, size } = session;
  for (let attempt = 0; attempt < 3; attempt++) {
    set({ upload: { status: "transferring", name, size, transferred: 0, speed: null } });
    const completed = await api("/api/community/upload/complete", "POST");
    if (run !== runId) return;
    if (!completed?.ok) return fail("UPLOAD_FAILED");
    const samples: [number, number][] = [];
    for (let tries = 0; tries < 4800; tries++) {
      await sleep(3000);
      if (run !== runId) return;
      const status = await api("/api/community/upload/status");
      if (!status) continue; // network hiccup
      if (status.status === "done" && status.file) {
        set({ upload: { status: "uploaded", name, size, file: status.file } });
        if (state.submission.status === "queued") void sendForReview();
        return;
      }
      if (status.error) break;
      const now = Date.now();
      const bytes = status.transferred ?? 0;
      samples.push([now, bytes]);
      while (samples.length > 2 && now - samples[0][0] > 15000) samples.shift();
      const [t0, b0] = samples[0];
      set({
        upload: {
          status: "transferring",
          name,
          size,
          transferred: bytes,
          speed: now - t0 >= 5000 ? ((bytes - b0) * 1000) / (now - t0) : null,
        },
      });
    }
  }
  fail("TRANSFER_FAILED");
}

// ---------------------------------------------------------------- actions --

export function setDraft(patch: Partial<Draft>) {
  set({ draft: { ...state.draft, ...patch } });
}

/** Starts an upload — or resumes an interrupted one when the same file is picked again. */
export async function startUpload(file: File, maxBytes: number) {
  if (!file.type.startsWith("video/") && !VIDEO_EXT.test(file.name)) {
    return set({ upload: { status: "error", code: "NOT_VIDEO", resumable: false } });
  }
  if (file.size > maxBytes) return set({ upload: { status: "error", code: "TOO_LARGE", resumable: false } });

  const run = ++runId;
  xhrs.forEach((xhr) => xhr.abort());
  const same =
    session && session.name === file.name && session.size === file.size && session.lastModified === file.lastModified;
  if (same && session && (state.upload.status === "interrupted" || state.upload.status === "error")) {
    session.file = file;
    return resumeUpload();
  }

  if (!state.draft.title && !isEpisodic(state.draft.category)) {
    setDraft({
      title: file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[._]+/g, " ")
        .trim()
        .slice(0, 140),
    });
  }
  set({
    upload: { status: "uploading", name: file.name, size: file.size, progress: 0, sent: 0, speed: null, eta: null },
    dismissed: false,
    submission: state.submission.status === "submitted" ? { status: "idle" } : state.submission,
  });
  try {
    const res = await fetch("/api/community/upload/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      ticket?: string;
      chunkSize?: number;
      totalChunks?: number;
      error?: string;
    };
    if (run !== runId) return;
    if (!data.ok || !data.ticket || !data.chunkSize || !data.totalChunks) {
      const code =
        data.error === "TOO_LARGE" ? "TOO_LARGE" : data.error === "RATE_LIMITED" ? "RATE_LIMITED" : "UPLOAD_FAILED";
      return set({ upload: { status: "error", code, resumable: false } });
    }
    session = {
      ticket: data.ticket,
      chunkSize: data.chunkSize,
      totalChunks: data.totalChunks,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      file,
    };
    persist();
    await sendPieces(run, []);
  } catch {
    if (run === runId) set({ upload: { status: "error", code: "UPLOAD_FAILED", resumable: false } });
  }
}

/** "Resume": asks the server what it already has and continues from there. */
export async function resumeUpload() {
  if (!session) return set({ upload: { status: "idle" } });
  const run = ++runId;
  const status = await api("/api/community/upload/status");
  if (run !== runId) return;
  if (status?.status === "done" && status.file) {
    set({ upload: { status: "uploaded", name: session.name, size: session.size, file: status.file } });
    if (state.submission.status === "queued") void sendForReview();
    return;
  }
  if (status?.status === "transferring") return followTransfer(run);
  if (!session.file) return set({ upload: { status: "interrupted", name: session.name, size: session.size } });
  await sendPieces(run, status?.received ?? []);
}

export function cancelUpload() {
  runId++;
  xhrs.forEach((xhr) => xhr.abort());
  xhrs.clear();
  session = null;
  guardTab(false);
  set({
    upload: { status: "idle" },
    submission: state.submission.status === "queued" ? { status: "idle" } : state.submission,
  });
}

export type DraftError = "TITLE" | "DESCRIPTION" | "YEAR" | "POSTER_URL";

/** Checks the form before it's queued (so it doesn't fail at the end of a long upload). */
function checkDraft(draft: Draft): DraftError | null {
  const episodic = isEpisodic(draft.category);
  if (episodic ? !draft.seriesTitle.trim() : !draft.title.trim()) return "TITLE";
  if (draft.description.trim().length < 10) return "DESCRIPTION";
  const year = Number(draft.year);
  if (draft.year && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1)) return "YEAR";
  if (draft.posterUrl && !/^https:\/\/\S+$/i.test(draft.posterUrl)) return "POSTER_URL";
  return null;
}

/** "Submit for review": now if the video is on the server, otherwise as soon as it is. */
export function submitForReview(): DraftError | null {
  const error = checkDraft(state.draft);
  if (error) return error;
  set({ submission: { status: "queued" } });
  if (state.upload.status === "uploaded") void sendForReview();
  return null;
}

async function sendForReview() {
  if (state.upload.status !== "uploaded" || state.submission.status === "submitting") return;
  const { draft } = state;
  const fileCode = state.upload.file.fileCode;
  set({ submission: { status: "submitting" } });
  const result = await submitCommunityVideo({
    category: draft.category,
    title: draft.title,
    seriesTitle: draft.seriesTitle,
    season: draft.season,
    episode: draft.episode,
    description: draft.description,
    year: draft.year ? Number(draft.year) : null,
    genres: draft.genres,
    language: draft.language || null,
    cast: draft.cast || null,
    posterUrl: draft.posterUrl || null,
    posterData: draft.posterData,
    doodFileCode: fileCode,
  }).catch(() => ({ ok: false as const, error: "FAILED" }));
  if (result.ok) {
    const title = isEpisodic(draft.category)
      ? `${draft.seriesTitle} · S${draft.season} E${draft.episode}`
      : draft.title;
    session = null;
    set({
      submission: { status: "submitted", id: result.id, category: draft.category, title },
      dismissed: false,
    });
  } else {
    set({ submission: { status: "failed", error: result.error } });
  }
}

/** After a submitted video: a fresh form (same series, next episode). */
export function startAnother() {
  const { draft } = state;
  runId++;
  session = null;
  set({
    upload: { status: "idle" },
    submission: { status: "idle" },
    draft: {
      ...EMPTY_DRAFT,
      category: draft.category,
      seriesTitle: draft.seriesTitle,
      season: draft.season,
      episode: isEpisodic(draft.category) ? Math.min(draft.episode + 1, 200) : 1,
      language: draft.language,
      genres: draft.genres,
    },
  });
}

/** Closes the floating widget (finished / failed uploads only). */
export function dismissWidget() {
  if (state.submission.status === "submitted") return startAnother();
  set({ dismissed: true });
}
