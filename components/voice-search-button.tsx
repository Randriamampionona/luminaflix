"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "idle" | "hint" | "recording" | "transcribing";

/** The guidance popover shows this long before recording starts on its own. */
const HINT_MS = 2_000;
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
 * - First shows a short guidance popover ("describe a plot, character or
 *   scene…"); recording starts after 2 s, or right away with "Start now".
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
  const meterRef = useRef<HTMLSpanElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverId = useId();

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (ringRef.current) ringRef.current.style.transform = "scale(1)";
    if (meterRef.current) meterRef.current.style.transform = "scaleX(0)";
  }, []);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
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
      setStatus("idle");
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
      setStatus("idle");
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

    // Live level → pulse ring + meter, and stop after a short silence once speech started.
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
        if (meterRef.current) meterRef.current.style.transform = `scaleX(${Math.min(rms * 8, 1)})`;
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

  const beginCapture = async () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = null;
    const canRecord = typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices;
    if (canRecord && (await checkServer())) await startRecording();
    else startBrowserRecognition();
  };

  const cancelHint = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = null;
    setStatus("idle");
  }, []);

  // Escape closes the guidance popover.
  useEffect(() => {
    if (status !== "hint") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cancelHint();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [status, cancelHint]);

  const onClick = () => {
    if (status === "transcribing") return;
    if (status === "hint") return void beginCapture(); // second click = start now
    if (status === "recording") {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      recognitionRef.current?.stop();
      return;
    }
    setStatus("hint");
    hintTimerRef.current = setTimeout(() => void beginCapture(), HINT_MS);
  };

  const dims = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" }[size];
  const icon = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" }[size];
  const recording = status === "recording";
  const showPopover = status !== "idle";

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
        aria-expanded={showPopover}
        aria-controls={showPopover ? popoverId : undefined}
        aria-label={recording ? t("stop") : status === "hint" ? t("startNow") : t("start")}
        title={recording ? t("stop") : t("start")}
        className={cn(
          "relative flex cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
          dims,
          recording || status === "hint"
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

      {/* Guidance popover: shown before recording, then live status. */}
      {showPopover && (
        <span
          id={popoverId}
          role="group"
          aria-label={t("hintTitle")}
          className="absolute top-full right-0 z-50 mt-3 block w-72 rounded-2xl border border-line-strong bg-surface p-4 text-left shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-t border-l border-line-strong bg-surface"
          />
          <span className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-brand">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="block min-w-0 space-y-1">
              <span aria-live="polite" className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                {status === "hint" ? t("hintTitle") : status === "recording" ? t("listening") : t("transcribing")}
              </span>
              <span className="block text-xs leading-relaxed font-medium normal-case not-italic tracking-normal text-fg-soft">
                {status === "recording" ? t("listeningHint") : t("hintBody")}
              </span>
            </span>
          </span>

          {status === "hint" && (
            <>
              {/* 2-second countdown before recording starts by itself */}
              <span className="mt-3 block h-1 overflow-hidden rounded-full bg-tint-strong">
                <span className="block h-full origin-left rounded-full bg-cyan-500 animate-[voice-countdown_2s_linear_forwards]" />
              </span>
              <span className="mt-1.5 block text-[10px] text-fg-subtle">{t("autoStart")}</span>
              <span className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void beginCapture()}
                  className="flex-1 cursor-pointer rounded-xl bg-cyan-500 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
                >
                  {t("startNow")}
                </button>
                <button
                  type="button"
                  onClick={cancelHint}
                  className="cursor-pointer rounded-xl border border-line-strong px-3 py-2 text-[10px] font-black uppercase tracking-widest text-fg-muted transition-colors hover:text-foreground"
                >
                  {t("cancel")}
                </button>
              </span>
            </>
          )}

          {recording && (
            // Live microphone level
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-tint-strong">
              <span
                ref={meterRef}
                className="block h-full origin-left scale-x-0 rounded-full bg-linear-to-r from-cyan-400 to-blue-500 transition-transform duration-75"
              />
            </span>
          )}
        </span>
      )}
    </span>
  );
}