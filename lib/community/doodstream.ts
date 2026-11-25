import "server-only";

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
export async function getUploadServer() {
  const server = await get<string>("/upload/server");
  if (typeof server !== "string" || !/^https:\/\//.test(server)) throw new Error("DoodStream: no upload server");
  return `${server}${server.includes("?") ? "&" : "?"}key=${encodeURIComponent(KEY)}`;
}

/** The API key as the first multipart field (DoodStream wants it in the form too). */
export function apiKeyPart(boundary: string) {
  return `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${KEY}\r\n`;
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

export function toDoodFile(raw: RawFile): DoodFile | null {
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
