import "server-only";

/**
 * Minimal client for OpenAI-compatible APIs (no SDK dependency).
 *
 * Providers (first configured wins):
 * 1. Groq — free tier, no card needed: set GROQ_API_KEY.
 *    Defaults: openai/gpt-oss-20b (search) + whisper-large-v3-turbo (voice).
 *    (Groq moved its Llama models to enterprise-only in 2026.)
 * 2. OpenAI — paid (prepaid credits): set OPENAI_API_KEY.
 *    Defaults: gpt-4o-mini + whisper-1.
 *
 * Overrides: AI_BASE_URL, AI_SEARCH_MODEL, AI_TRANSCRIBE_MODEL
 * (the older OPENAI_BASE_URL / OPENAI_SEARCH_MODEL / OPENAI_TRANSCRIBE_MODEL still work).
 *
 * Providers retire models often, so the model actually used is checked
 * against the provider's /models list once and replaced by the first
 * available fallback if needed (see getModel).
 */
type Provider = "groq" | "openai";

const PROVIDERS: Record<Provider, { baseUrl: string; searchModel: string; transcribeModel: string }> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    searchModel: "openai/gpt-oss-20b",
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

const CONFIGURED = {
  search: process.env.AI_SEARCH_MODEL || process.env.OPENAI_SEARCH_MODEL || defaults.searchModel,
  transcribe: process.env.AI_TRANSCRIBE_MODEL || process.env.OPENAI_TRANSCRIBE_MODEL || defaults.transcribeModel,
};

/** Fallbacks, best first, across Groq and OpenAI model names. */
const FALLBACKS = {
  search: [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "gpt-4o-mini",
    "gpt-4.1-mini",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ],
  transcribe: ["whisper-large-v3-turbo", "whisper-large-v3", "gpt-4o-mini-transcribe", "whisper-1"],
};

type ModelKind = keyof typeof CONFIGURED;
const resolved: Partial<Record<ModelKind, Promise<string>>> = {};

async function listModels(): Promise<Set<string> | null> {
  try {
    const data = await openaiRequest<{ data?: { id: string }[] }>("/models", { timeoutMs: 8_000 });
    return new Set((data.data ?? []).map((m) => m.id));
  } catch {
    return null; // can't list: trust the configured model
  }
}

/**
 * The model to use for search or transcription: the configured one if the
 * provider still serves it, otherwise the first available fallback.
 */
export function getModel(kind: ModelKind): Promise<string> {
  return (resolved[kind] ??= listModels().then((available) => {
    const wanted = CONFIGURED[kind];
    if (!available || available.has(wanted)) return wanted;
    const fallback = FALLBACKS[kind].find((id) => available.has(id));
    if (fallback) {
      console.warn(`[ai] Model "${wanted}" is not available on ${PROVIDER}; using "${fallback}" instead.`);
      return fallback;
    }
    return wanted;
  }));
}

/** Forget the resolved models (e.g. after a 404 model_not_found). */
export function resetModels() {
  delete resolved.search;
  delete resolved.transcribe;
}

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