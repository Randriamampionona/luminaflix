import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { uploadToDood } from "./doodstream";

/**
 * Piece-by-piece upload of community videos.
 *
 * The browser sends the video in pieces of CHUNK_BYTES, several at a time (each
 * request stays under the hosting's request-size limit and needs no Clerk session).
 * Pieces are written to UPLOAD_ROOT/<id>/<n>.part. When the last one is in, the
 * server streams them, in order, to DoodStream as one upload, then deletes them.
 * Each upload has a signed ticket (valid 12 h) instead of the Clerk session, and
 * leftovers of abandoned uploads are deleted after 24 h.
 *
 * Folder shared by every server process (state lives in meta.json, not in memory).
 */
const CHUNK_BYTES = 8 * 1024 * 1024;
const UPLOAD_ROOT = process.env.COMMUNITY_UPLOAD_DIR || path.join(homedir(), ".luminaflix-uploads");
const TICKET_TTL_MS = 12 * 60 * 60 * 1000;
/** A transfer with no sign of life for this long died with its server process: it can be restarted. */
const STALLED_MS = 3 * 60 * 1000;
const ABANDONED_MS = 24 * 60 * 60 * 1000;
const SECRET =
  process.env.COMMUNITY_UPLOAD_SECRET || process.env.CLERK_SECRET_KEY || process.env.DOODSTREAM_API_KEY || "";

type Status = "receiving" | "transferring" | "done" | "error";

interface Meta {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  totalChunks: number;
  status: Status;
  createdAt: number;
  updatedAt: number;
  file?: unknown;
  error?: string;
  /** Transfer to DoodStream: bytes sent so far. */
  transferred?: number;
}

const isId = (id: string) => /^[a-f0-9]{24}$/.test(id);
const dirOf = (id: string) => path.join(UPLOAD_ROOT, id);
const metaPath = (id: string) => path.join(dirOf(id), "meta.json");
const partPath = (id: string, index: number) => path.join(dirOf(id), `${index}.part`);
const expectedSize = (meta: Meta, index: number) =>
  index < meta.totalChunks - 1 ? CHUNK_BYTES : meta.size - CHUNK_BYTES * (meta.totalChunks - 1);

const sign = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("hex");

function makeTicket(id: string, userId: string) {
  const payload = `${id}.${userId}.${Date.now() + TICKET_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** The upload id of a valid, unexpired ticket (null otherwise). */
export function verifyTicket(ticket: string | null) {
  if (!ticket || !SECRET) return null;
  const parts = ticket.split(".");
  if (parts.length !== 4) return null;
  const [id, userId, exp, mac] = parts;
  const expected = Buffer.from(sign(`${id}.${userId}.${exp}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!isId(id) || Number(exp) < Date.now()) return null;
  return { id, userId };
}

async function readMeta(id: string): Promise<Meta | null> {
  try {
    return JSON.parse(await readFile(metaPath(id), "utf8")) as Meta;
  } catch {
    return null;
  }
}

/** Atomic write (temp file + rename): pieces arrive in parallel, readers never see half a file. */
async function saveMeta(meta: Meta) {
  meta.updatedAt = Date.now();
  const tmp = `${metaPath(meta.id)}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(meta));
  await rename(tmp, metaPath(meta.id));
}

/** Deletes uploads untouched for 24 h (run when a new upload starts). */
async function cleanupAbandoned() {
  const entries = await readdir(UPLOAD_ROOT).catch(() => [] as string[]);
  await Promise.all(
    entries.filter(isId).map(async (id) => {
      const info = await stat(dirOf(id)).catch(() => null);
      const meta = await readMeta(id);
      const last = meta?.updatedAt ?? info?.mtimeMs ?? 0;
      if (Date.now() - last > ABANDONED_MS) await rm(dirOf(id), { recursive: true, force: true });
    }),
  );
}

export async function startUpload({
  userId,
  name,
  type,
  size,
}: {
  userId: string;
  name: string;
  type: string;
  size: number;
}) {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  void cleanupAbandoned().catch(() => {});
  const id = randomBytes(12).toString("hex");
  await mkdir(dirOf(id), { recursive: true });
  const meta: Meta = {
    id,
    userId,
    name: name.slice(0, 200),
    type: type.slice(0, 100),
    size,
    totalChunks: Math.max(1, Math.ceil(size / CHUNK_BYTES)),
    status: "receiving",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveMeta(meta);
  return { id, ticket: makeTicket(id, userId), chunkSize: CHUNK_BYTES, totalChunks: meta.totalChunks };
}

/** Writes one piece (sending the same piece again just replaces it). */
export async function writeChunk(id: string, index: number, body: ReadableStream<Uint8Array>) {
  const meta = await readMeta(id);
  if (!meta) return { ok: false as const, error: "NOT_FOUND", status: 404 };
  if (meta.status !== "receiving") return { ok: false as const, error: "CLOSED", status: 409 };
  if (!Number.isInteger(index) || index < 0 || index >= meta.totalChunks)
    return { ok: false as const, error: "INDEX", status: 400 };
  const tmp = `${partPath(id, index)}.tmp`;
  await pipeline(Readable.fromWeb(body as never), createWriteStream(tmp));
  const written = (await stat(tmp)).size;
  if (written !== expectedSize(meta, index)) {
    await rm(tmp, { force: true });
    return { ok: false as const, error: "SIZE", status: 400 };
  }
  await rename(tmp, partPath(id, index));
  await saveMeta(meta);
  return { ok: true as const };
}

/** Pieces already received (so the browser resumes where it stopped). */
async function receivedChunks(meta: Meta) {
  const files = await readdir(dirOf(meta.id)).catch(() => [] as string[]);
  const done: number[] = [];
  for (const f of files) {
    const m = f.match(/^(\d+)\.part$/);
    if (!m) continue;
    const index = Number(m[1]);
    const size = (await stat(partPath(meta.id, index)).catch(() => null))?.size;
    if (size === expectedSize(meta, index)) done.push(index);
  }
  return done.sort((a, b) => a - b);
}

export async function uploadStatus(id: string) {
  const meta = await readMeta(id);
  if (!meta) return null;
  // The process doing the transfer stopped (restart, deploy…): say so, so the browser can restart it.
  if (meta.status === "transferring" && Date.now() - meta.updatedAt > STALLED_MS) {
    console.error(`[community] transfer ${id} stalled — waiting for a restart`);
    meta.status = "receiving";
    meta.error = "TRANSFER_STALLED";
    await saveMeta(meta);
  }
  return {
    status: meta.status,
    totalChunks: meta.totalChunks,
    received: meta.status === "receiving" ? await receivedChunks(meta) : [],
    size: meta.size,
    transferred: meta.transferred ?? 0,
    file: meta.file ?? null,
    error: meta.error ?? null,
  };
}

/**
 * All pieces in → reassembled on the fly and sent to DoodStream, in the
 * background (the browser follows with uploadStatus). Pieces are deleted after.
 */
export async function completeUpload(id: string) {
  const meta = await readMeta(id);
  if (!meta) return { ok: false as const, error: "NOT_FOUND", status: 404 };
  if (meta.status === "done") return { ok: true as const };
  if (meta.status === "transferring" && Date.now() - meta.updatedAt < STALLED_MS) return { ok: true as const };
  const received = await receivedChunks(meta);
  if (received.length !== meta.totalChunks) return { ok: false as const, error: "MISSING", status: 409 };

  meta.status = "transferring";
  meta.error = undefined;
  meta.transferred = 0;
  await saveMeta(meta);
  console.log(`[community] transfer ${id} → DoodStream started (${(meta.size / 1024 ** 2).toFixed(0)} MB)`);

  async function* pieces() {
    for (let i = 0; i < meta!.totalChunks; i++) {
      for await (const chunk of createReadStream(partPath(meta!.id, i), { highWaterMark: 1024 * 1024 })) {
        yield chunk as Uint8Array;
      }
    }
  }

  // Not awaited: the transfer server → DoodStream can take a few minutes.
  void (async () => {
    // Sign of life every 20 s (also while DoodStream processes the file after the last byte).
    let lastSave = 0;
    let lastLog = 0;
    const heartbeat = setInterval(() => void saveMeta(meta).catch(() => {}), 20_000);
    try {
      const file = await uploadToDood({
        name: meta.name,
        type: meta.type,
        size: meta.size,
        chunks: pieces(),
        onProgress: (sent) => {
          meta.transferred = sent;
          const now = Date.now();
          if (now - lastSave > 3000) {
            lastSave = now;
            void saveMeta(meta).catch(() => {});
          }
          const percent = Math.floor((sent / meta.size) * 100);
          if (percent >= lastLog + 10) {
            lastLog = percent;
            console.log(`[community] transfer ${id}: ${percent}%`);
          }
        },
      });
      clearInterval(heartbeat);
      await Promise.all(Array.from({ length: meta.totalChunks }, (_, i) => rm(partPath(meta.id, i), { force: true })));
      meta.status = "done";
      meta.file = file;
      await saveMeta(meta);
      console.log(`[community] transfer ${id} done → DoodStream file ${file.fileCode}`);
    } catch (error) {
      clearInterval(heartbeat);
      console.error(`[community] transfer ${id} to DoodStream failed`, error);
      // Pieces are kept: "complete" can be called again to retry.
      meta.status = "receiving";
      meta.error = "TRANSFER_FAILED";
      await saveMeta(meta).catch(() => {});
    }
  })();
  return { ok: true as const };
}
