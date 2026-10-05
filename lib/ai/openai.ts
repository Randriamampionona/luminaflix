import "server-only";

/**
 * Minimal client for OpenAI-compatible APIs (no SDK dependency).
 *
 * Providers (first configured wins):
 * 1. Groq — free tier, no card needed: set GROQ_API_KEY.
 *    Defaults: llama-3.3-70b-versatile (search) + whisper-large-v3-turbo (voice).
 * 2. OpenAI — paid (prepaid credits): set OPENAI_API_KEY.
 *    Defaults: gpt-4o-mini + whisper-1.
 *
 * Overrides: AI_BASE_URL, AI_SEARCH_MODEL, AI_TRANSCRIBE_MODEL
 * (the older OPENAI_BASE_URL / OPENAI_SEARCH_MODEL / OPENAI_TRANSCRIBE_MODEL still work).
 */
type Provider = "groq" | "openai";

const PROVIDERS: Record<Provider, { baseUrl: string; searchModel: string; transcribeModel: string }> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    searchModel: "llama-3.3-70b-versatile",
    transcribeModel: "whisper-large-v3-turbo",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    searchModel: "gpt-4o-mini",
    transcribeModel: "whisper-1",
  },
};

const PROVIDER: Provider | null = process.env.GROQ_API_KEY ? "groq" : process.env.OPENAI_API_KEY ? "openai" : null;
const API_KEY = PROVIDER === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
const defaults = PROVIDERS[PROVIDER ?? "openai"];

const BASE_URL = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || defaults.baseUrl).replace(/\/$/, "");

export const OPENAI_SEARCH_MODEL =
  process.env.AI_SEARCH_MODEL || process.env.OPENAI_SEARCH_MODEL || defaults.searchModel;
export const OPENAI_TRANSCRIBE_MODEL =
  process.env.AI_TRANSCRIBE_MODEL || process.env.OPENAI_TRANSCRIBE_MODEL || defaults.transcribeModel;

export function isOpenAIConfigured() {
  return Boolean(API_KEY);
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
  if (!API_KEY) throw new OpenAIError("No AI provider configured (set GROQ_API_KEY or OPENAI_API_KEY)", 501);

  const { timeoutMs = 15_000, headers, ...rest } = init;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${API_KEY}`, ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new OpenAIError(`${PROVIDER} ${path} → ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as T;
}