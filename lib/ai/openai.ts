import "server-only";

/**
 * Minimal OpenAI REST client (no SDK dependency).
 *
 * Env:
 * - OPENAI_API_KEY            required for AI search & voice transcription
 * - OPENAI_BASE_URL           optional (proxy / compatible gateway)
 * - OPENAI_SEARCH_MODEL       default "gpt-4o-mini"
 * - OPENAI_TRANSCRIBE_MODEL   default "whisper-1" (supports fr, en and mg)
 */
const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

export const OPENAI_SEARCH_MODEL = process.env.OPENAI_SEARCH_MODEL || "gpt-4o-mini";
export const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

export async function openaiRequest<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAIError("OPENAI_API_KEY is not set", 501);

  const { timeoutMs = 15_000, headers, ...rest } = init;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${apiKey}`, ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new OpenAIError(`OpenAI ${path} → ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as T;
}