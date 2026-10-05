import { OpenAIError, getModel, isOpenAIConfigured, openaiRequest, resetModels } from "@/lib/ai/openai";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

/**
 * Voice search transcription (Whisper).
 *
 * GET  → { available: boolean }  (the client falls back to the browser's
 *        Web Speech API when server transcription isn't configured)
 * POST multipart/form-data { audio: Blob } → { text: string }
 *
 * Whisper auto-detects the language (French, English and Malagasy included).
 */
const MAX_BYTES = 4 * 1024 * 1024; // ≈ 1–2 min of opus audio; the client stops at 12 s
const limited = createRateLimiter({ max: 15, windowMs: 10 * 60 * 1000 });

export async function GET() {
  return Response.json({ available: isOpenAIConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: "Voice transcription is not configured" }, { status: 501 });
  }
  if (limited(await getClientIp())) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get("audio");
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "Missing audio" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ error: "Recording too long" }, { status: 413 });
  }
  if (audio.type && !audio.type.startsWith("audio/") && !audio.type.startsWith("video/webm")) {
    return Response.json({ error: "Unsupported audio type" }, { status: 415 });
  }

  const extension = audio.type.includes("mp4")
    ? "mp4"
    : audio.type.includes("ogg")
      ? "ogg"
      : audio.type.includes("wav")
        ? "wav"
        : "webm";

  const form = new FormData();
  form.append("file", audio, `voice-search.${extension}`);
  form.append("model", await getModel("transcribe"));
  form.append("response_format", "json");
  // Vocabulary hint: titles, and the three languages we expect.
  form.append(
    "prompt",
    "Movie, TV series, anime or K-drama search. The speaker may use French, English or Malagasy and say titles like Death Note, Squid Game, One Piece.",
  );

  try {
    const result = await openaiRequest<{ text?: string }>("/audio/transcriptions", {
      method: "POST",
      body: form,
      timeoutMs: 30_000,
    });
    const text = (result.text ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[transcribe]", error instanceof Error ? error.message : error);
    if (error instanceof OpenAIError && error.status === 404) resetModels();
    const status = error instanceof OpenAIError && error.status === 429 ? 503 : 502;
    return Response.json({ error: "Transcription failed" }, { status });
  }
}