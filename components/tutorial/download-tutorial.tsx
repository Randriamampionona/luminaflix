"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Download,
  Play,
  PlayCircle,
  QrCode,
  RotateCcw,
  Smartphone,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TutorialStep {
  n: string;
  /** Second of the video where this step starts. */
  time: number;
  image: string;
  title: string;
  body: string;
  method?: "direct" | "app";
}

export interface TutorialMethod {
  key: "direct" | "app";
  badge: string;
  title: string;
  body: string;
  note: string;
  steps: string;
}

export interface TutorialTexts {
  watchVideo: string;
  watchVideoSub: string;
  readSteps: string;
  videoTitle: string;
  chapters: string;
  adsTitle: string;
  adsBody: string;
  adsTip: string;
  methodsTitle: string;
  stepsTitle: string;
  stepLabel: string;
  watchStep: string;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
  replay: string;
}

const VIDEO_SRC = "/tutorials/download-tutorial.mp4";
const POSTER = "/tutorials/download-tutorial-poster.webp";
const IMAGE = (name: string) => `/tutorials/download/${name}.webp`;

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * /download-tutorial: the video (with clickable chapters that follow playback),
 * the ad notice, the two download methods, then every step with its
 * highlighted screenshot and a "watch this step" button that jumps the video
 * to that moment.
 */
export default function DownloadTutorial({
  steps,
  methods,
  texts,
}: {
  steps: TutorialStep[];
  methods: TutorialMethod[];
  texts: TutorialTexts;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBoxRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(-1);

  const stepAt = (time: number) => {
    let index = -1;
    steps.forEach((s, i) => {
      if (time >= s.time) index = i;
    });
    return index;
  };

  /** Jump to a moment of the video and play it (scrolling it into view). */
  const playFrom = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    videoBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    video.currentTime = time;
    void video.play().catch(() => {});
  };

  const stepLabel = (n: string) => texts.stepLabel.replace("{n}", n);

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* Main actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => playFrom(0)}
          className="group flex items-center gap-3 rounded-2xl bg-cyan-500 py-3 pr-6 pl-3 text-black shadow-[0_14px_40px_-12px_rgba(6,182,212,0.8)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/15">
            <Play className="h-5 w-5 fill-current" aria-hidden />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-black tracking-wide uppercase">{texts.watchVideo}</span>
            <span className="text-[10px] font-bold tracking-widest text-black/60 uppercase">{texts.watchVideoSub}</span>
          </span>
        </button>
        <a
          href="#steps"
          className="flex items-center justify-center gap-2 rounded-2xl border border-line-strong bg-tint px-6 py-4 text-xs font-black tracking-widest text-fg-soft uppercase transition-colors hover:border-cyan-500/50 hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          {texts.readSteps}
        </a>
      </div>

      {/* Video + chapters */}
      <section aria-label={texts.videoTitle} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div
          ref={videoBoxRef}
          className="relative overflow-hidden rounded-3xl border border-line-strong bg-black shadow-[0_30px_80px_-30px_rgba(6,182,212,0.55)]"
        >
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            poster={POSTER}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setCurrent(stepAt(e.currentTarget.currentTime))}
            className="block aspect-video h-auto w-full bg-black"
            aria-label={texts.videoTitle}
          />
        </div>

        <nav aria-label={texts.chapters} className="rounded-3xl border border-line bg-surface p-3">
          <p className="px-3 pt-2 pb-3 text-[10px] font-black tracking-[0.25em] text-fg-subtle uppercase">
            {texts.chapters}
          </p>
          <ol className="max-h-[420px] space-y-1 overflow-y-auto pr-1 lg:max-h-[calc(100%-2.5rem)]">
            {steps.map((step, i) => (
              <li key={step.n}>
                <button
                  type="button"
                  onClick={() => playFrom(step.time)}
                  aria-current={current === i ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    current === i ? "bg-cyan-500/15 ring-1 ring-cyan-500/40" : "hover:bg-tint",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-[11px] font-black",
                      current === i ? "bg-cyan-500 text-black" : "bg-tint-strong text-fg-soft",
                    )}
                  >
                    {step.n}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{step.title}</span>
                  <span className="shrink-0 font-mono text-[10px] text-fg-faint">{formatTime(step.time)}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      {/* Ads notice */}
      <aside
        role="note"
        className="flex gap-4 rounded-3xl border border-amber-400/40 bg-linear-to-r from-amber-400/12 via-amber-400/5 to-transparent p-5 sm:p-6"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-500 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-2">
          <h2 className="text-base font-black text-foreground">{texts.adsTitle}</h2>
          <p className="text-sm leading-relaxed text-fg-muted">{texts.adsBody}</p>
          <p className="text-sm leading-relaxed font-semibold text-amber-600 dark:text-amber-300">{texts.adsTip}</p>
        </div>
      </aside>

      {/* The two methods */}
      <section aria-labelledby="methods-title" className="space-y-6">
        <h2 id="methods-title" className="text-2xl font-black tracking-tight text-foreground uppercase italic">
          {texts.methodsTitle}
          <span className="text-brand not-italic">.</span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {methods.map((method) => {
            const Icon = method.key === "direct" ? Zap : Smartphone;
            return (
              <div
                key={method.key}
                className={cn(
                  "relative overflow-hidden rounded-3xl border bg-surface p-6",
                  method.key === "direct" ? "border-cyan-500/30" : "border-purple-500/30",
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl",
                    method.key === "direct" ? "bg-cyan-500/15" : "bg-purple-500/15",
                  )}
                />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase",
                        method.key === "direct"
                          ? "bg-cyan-500/15 text-brand"
                          : "bg-purple-500/15 text-purple-500 dark:text-purple-300",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {method.badge}
                    </span>
                    <span className="text-[10px] font-bold tracking-widest text-fg-faint uppercase">
                      {method.steps}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-foreground">{method.title}</h3>
                  <p className="text-sm leading-relaxed text-fg-muted">{method.body}</p>
                  <p className="flex items-start gap-2 rounded-2xl border border-line bg-tint p-3 text-xs leading-relaxed font-semibold text-fg-soft">
                    {method.key === "direct" ? (
                      <Download className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                    ) : (
                      <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-purple-500 dark:text-purple-300" aria-hidden />
                    )}
                    {method.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Step by step */}
      <section id="steps" aria-labelledby="steps-title" className="scroll-mt-28 space-y-8">
        <h2 id="steps-title" className="text-2xl font-black tracking-tight text-foreground uppercase italic">
          {texts.stepsTitle}
          <span className="text-brand not-italic">.</span>
        </h2>
        <ol className="space-y-6">
          {steps.map((step) => (
            <li
              key={step.n}
              className="grid items-center gap-5 overflow-hidden rounded-3xl border border-line bg-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8"
            >
              <figure className="overflow-hidden rounded-2xl border border-line-strong bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element -- light, pre-optimised WebP screenshots */}
                <img
                  src={IMAGE(step.image)}
                  alt={`${stepLabel(step.n)} — ${step.title}`}
                  width={1280}
                  height={667}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full"
                />
              </figure>
              <div className="space-y-3 lg:pr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-cyan-500 px-2.5 py-1 text-[11px] font-black tracking-wider text-black uppercase">
                    {stepLabel(step.n)}
                  </span>
                  {step.method && (
                    <span
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[10px] font-black tracking-widest uppercase",
                        step.method === "direct"
                          ? "bg-cyan-500/15 text-brand"
                          : "bg-purple-500/15 text-purple-500 dark:text-purple-300",
                      )}
                    >
                      {methods.find((m) => m.key === step.method)?.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black tracking-tight text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted sm:text-base">{step.body}</p>
                <button
                  type="button"
                  onClick={() => playFrom(step.time)}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-[11px] font-black tracking-widest text-brand uppercase transition-colors hover:bg-cyan-500 hover:text-black"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden />
                  {texts.watchStep}
                  <span className="font-mono text-[10px] opacity-70">{formatTime(step.time)}</span>
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Final call to action */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-linear-to-br from-cyan-500/15 via-surface to-purple-500/10 p-8 text-center sm:p-12">
        <div className="mx-auto max-w-xl space-y-4">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic sm:text-3xl">
            {texts.finalTitle}
          </h2>
          <p className="text-sm text-fg-muted sm:text-base">{texts.finalBody}</p>
          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3.5 text-xs font-black tracking-widest text-black uppercase shadow-[0_14px_40px_-12px_rgba(6,182,212,0.8)] hover:bg-cyan-400"
            >
              {texts.finalCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => playFrom(0)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line-strong bg-tint px-6 py-3.5 text-xs font-black tracking-widest text-fg-soft uppercase hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              {texts.replay}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
