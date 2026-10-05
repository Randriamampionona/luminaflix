"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "idle" | "recording" | "transcribing";

const MAX_RECORDING_MS = 12_000;
const SILENCE_STOP_MS = 1_600;
const SPEECH_LEVEL = 0.06; // RMS level counted as speech
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

// Browser speech recognition (fallback when server transcription is off).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
const getSpeechRecognition = () =>
  (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
    .SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

let serverAvailable: Promise<boolean> | null = null;
const checkServer = () =>
  (serverAvailable ??= fetch("/api/search/transcribe")
    .then((r) => r.json())
    .then((d: { available?: boolean }) => Boolean(d.available))
    .catch(() => false));

/**
 * Microphone button for voice search.
 *
 * - Records with MediaRecorder and sends the clip to /api/search/transcribe
 *   (Whisper: French, English and Malagasy are auto-detected).
 * - Stops on its own after a short silence or 12 s; click again to stop.
 * - The ring pulses with the live microphone level while listening.
 * - Falls back to the browser's speech recognition (fr/en) when server
 *   transcription isn't configured.
 */
export default function VoiceSearchButton({
  onTranscript,
  size = "md",
  className,
}: {
  onTranscript: (text: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("search.voice");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const rafRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ringRef = useRef<HTMLSpanElement>(null);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (ringRef.current) ringRef.current.style.transform = "scale(1)";
  }, []);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      cleanup();
    },
    [cleanup],
  );

  const transcribe = async (blob: Blob) => {
    if (blob.size < 1500) {
      toast.info(t("noSpeech"));
      setStatus("idle");
      return;
    }
    setStatus("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/search/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string };
      const text = data.text?.trim();
      if (!res.ok || !text) throw new Error(String(res.status));
      onTranscript(text);
    } catch {
      toast.error(t("failed"));
    } finally {
      setStatus("idle");
    }
  };

  const startBrowserRecognition = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      toast.error(t("unsupported"));
      return;
    }
    const recognition = new Recognition();
    recognition.lang = locale === "fr" ? "fr-FR" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
    };
    recognition.onerror = (e) => {
      toast.error(e.error === "not-allowed" ? t("denied") : e.error === "no-speech" ? t("noSpeech") : t("failed"));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus("idle");
    };
    recognitionRef.current = recognition;
    setStatus("recording");
    recognition.start();
  };

  const startRecording = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      toast.error(error instanceof DOMException && error.name === "NotAllowedError" ? t("denied") : t("failed"));
      return;
    }
    streamRef.current = stream;

    const mimeType = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      cleanup();
      void transcribe(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    };
    recorderRef.current = recorder;

    // Live level → pulse ring + stop after a short silence once speech started.
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let heardSpeech = false;
      let silentSince = 0;
      const loop = () => {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
        if (ringRef.current) ringRef.current.style.transform = `scale(${1 + Math.min(rms * 6, 0.9)})`;
        const now = performance.now();
        if (rms > SPEECH_LEVEL) {
          heardSpeech = true;
          silentSince = 0;
        } else if (heardSpeech) {
          silentSince ||= now;
          if (now - silentSince > SILENCE_STOP_MS && recorder.state === "recording") recorder.stop();
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      // No Web Audio: still records, just without the level meter / auto-stop.
    }

    timersRef.current.push(
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_RECORDING_MS),
    );
    recorder.start();
    setStatus("recording");
  };

  const onClick = async () => {
    if (status === "transcribing") return;
    if (status === "recording") {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      recognitionRef.current?.stop();
      return;
    }
    const canRecord = typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices;
    if (canRecord && (await checkServer())) await startRecording();
    else startBrowserRecognition();
  };

  const dims = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" }[size];
  const icon = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" }[size];
  const recording = status === "recording";

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {recording && (
        <>
          <span
            ref={ringRef}
            aria-hidden
            className="absolute inset-0 rounded-full bg-cyan-500/30 transition-transform duration-75"
          />
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-cyan-500/25 motion-reduce:hidden" />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-pressed={recording}
        aria-label={recording ? t("stop") : t("start")}
        title={recording ? t("stop") : t("start")}
        className={cn(
          "relative flex cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
          dims,
          recording
            ? "border-cyan-400 bg-cyan-500 text-black"
            : "border-line-strong bg-tint text-fg-muted hover:border-cyan-500/50 hover:text-brand",
          status === "transcribing" && "cursor-wait",
        )}
      >
        {status === "transcribing" ? (
          <Loader2 className={cn(icon, "animate-spin")} aria-hidden />
        ) : recording ? (
          <Square className={cn(icon, "fill-current")} aria-hidden />
        ) : (
          <Mic className={icon} aria-hidden />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {recording ? t("listening") : status === "transcribing" ? t("transcribing") : ""}
      </span>
    </span>
  );
}