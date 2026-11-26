import "server-only";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

/**
 * DoodStream API (https://doodstream.com/api-docs), server only — the API key
 * never reaches the browser.
 *
 *   GET  {api}/upload/server?key=…            → { result: "https://xxx/upload/01" }
 *   POST {upload server}?key=…  (multipart: api_key, file)
 *                                              → { result: [{ filecode, protected_embed, splash_img, single_img, length, canplay, title, … }] }
 *   GET  {api}/file/info?key=…&file_code=…    → { result: [{ filecode, canplay, length, single_img, splash_img, title, … }] }
 */
const API = (process.env.DOODSTREAM_API_BASE || "https://doodapi.com/api").replace(/\/+$/, "");
const KEY = process.env.DOODSTREAM_API_KEY || "";
const EMBED_BASE = (process.env.DOODSTREAM_EMBED_BASE || "https://dood.li").replace(/\/+$/, "");

export const doodConfigured = () => !!KEY;

interface DoodResponse<T> {
  msg?: string;
  status?: number;
  result?: T;
}

interface DoodFile {
  fileCode: string;
  embedUrl: string;
  thumbnail: string | null;
  title: string | null;
  durationSec: number | null;
  canPlay: boolean;
}

async function get<T>(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ key: KEY, ...params });
  const res = await fetch(`${API}${path}?${query}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const data = (await res.json()) as DoodResponse<T>;
  if (data.status !== 200 || data.result === undefined)
    throw new Error(`DoodStream ${path}: ${data.msg ?? res.status}`);
  return data.result;
}

/** Upload server to post the next file to. */
async function getUploadServer() {
  const server = await get<string>("/upload/server");
  if (typeof server !== "string" || !/^https:\/\//.test(server)) throw new Error("DoodStream: no upload server");
  return `${server}${server.includes("?") ? "&" : "?"}key=${encodeURIComponent(KEY)}`;
}

/**
 * Sends a file to DoodStream as one multipart upload (api_key + file), streaming
 * its bytes from `chunks` (nothing is loaded in memory). Used once a piece-by-piece
 * upload is complete on our server.
 *
 * Plain node:https rather than fetch: fetch gives up when DoodStream hasn't
 * answered 5 minutes after the request started — far too short for a big file.
 * Here the only limit is 10 minutes without any activity.
 */
export async function uploadToDood({
  name,
  type,
  size,
  chunks,
  onProgress,
}: {
  name: string;
  type: string;
  size: number;
  chunks: AsyncIterable<Uint8Array>;
  /** Bytes of the video sent so far. */
  onProgress?: (sent: number) => void;
}): Promise<DoodFile> {
  const url = new URL(await getUploadServer());
  const boundary = `----luminaflix${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const safeName = name.replace(/["\r\n\\]/g, "_").slice(0, 200) || "video.mp4";
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${KEY}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
      `Content-Type: ${/^[\w.+-]+\/[\w.+-]+$/.test(type) ? type : "application/octet-stream"}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

  const text = await new Promise<string>((resolve, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(url, {
      method: "POST",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(head.byteLength + size + tail.byteLength),
      },
    });
    req.setTimeout(10 * 60 * 1000, () => req.destroy(new Error("DoodStream: no activity for 10 minutes")));
    req.on("error", reject);
    req.on("response", (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (part: string) => (data += part));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
    const write = (buffer: Uint8Array) =>
      new Promise<void>((done) => (req.write(buffer) ? done() : req.once("drain", done)));
    void (async () => {
      await write(head);
      let sent = 0;
      for await (const chunk of chunks) {
        await write(chunk);
        sent += chunk.byteLength;
        onProgress?.(sent);
      }
      await write(tail);
      req.end();
    })().catch((error) => req.destroy(error as Error));
  });

  let data: { msg?: string; status?: number; result?: unknown[] } | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    // not JSON: reported below
  }
  const raw = Array.isArray(data?.result) ? data.result[0] : null;
  const file = raw ? toDoodFile(raw as RawFile) : null;
  if (!file) throw new Error(`DoodStream upload failed: ${data?.msg ?? text.slice(0, 200)}`);
  return file;
}

const seconds = (length: unknown) => {
  const n = Number(length);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

const embedUrlFor = (fileCode: string) => `${EMBED_BASE}/e/${fileCode}`;

interface RawFile {
  filecode?: string;
  file_code?: string;
  protected_embed?: string;
  splash_img?: string;
  single_img?: string;
  title?: string;
  length?: string | number;
  canplay?: number | string;
  status?: number | string;
}

function toDoodFile(raw: RawFile): DoodFile | null {
  const fileCode = raw.filecode || raw.file_code;
  if (!fileCode || !/^[a-z0-9]+$/i.test(fileCode)) return null;
  const embed = raw.protected_embed && /^https:\/\//.test(raw.protected_embed) ? raw.protected_embed : null;
  return {
    fileCode,
    embedUrl: embed ?? embedUrlFor(fileCode),
    thumbnail: raw.splash_img || raw.single_img || null,
    title: raw.title ?? null,
    durationSec: seconds(raw.length),
    canPlay: String(raw.canplay ?? "") === "1",
  };
}

/** File status / info (processing done? duration, thumbnail). Null when unknown to DoodStream. */
export async function getFileInfo(fileCode: string): Promise<DoodFile | null> {
  if (!/^[a-z0-9]+$/i.test(fileCode)) return null;
  const result = await get<RawFile[]>("/file/info", { file_code: fileCode });
  const raw = Array.isArray(result) ? result[0] : null;
  if (!raw || String(raw.status ?? "200") === "404") return null;
  return toDoodFile(raw);
}
