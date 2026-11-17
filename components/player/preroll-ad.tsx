"use client";

import { Loader2, SkipForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  loadIma,
  markPrerollShown,
  prerollTagUrl,
  PREROLL_SKIP_AFTER_S,
  PREROLL_TIMEOUT_MS,
  type ImaAdsManager,
} from "@/lib/preroll";

/**
 * The video ad before the movie (VAST through Google's IMA SDK), shown inside
 * the player box. Calls `onDone` once — when the ad ends, is skipped, fails,
 * or when no ad starts within 8 s — and the movie's player loads.
 */
export default function PrerollAd({ onDone }: { onDone: () => void }) {
  const t = useTranslations("player.preroll");
  const containerRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [skipIn, setSkipIn] = useState(PREROLL_SKIP_AFTER_S);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;
    let done = false;
    let adsManager: ImaAdsManager | null = null;
    let adsLoader: { destroy(): void } | null = null;
    let displayContainer: { destroy(): void } | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const finish = () => {
      if (done) return;
      done = true;
      onDoneRef.current();
    };
    finishRef.current = finish;
    // No ad started in time → the movie.
    const timeout = setTimeout(finish, PREROLL_TIMEOUT_MS);

    void loadIma().then((ima) => {
      const box = containerRef.current;
      if (cancelled || done) return;
      if (!ima || !box) return finish();
      try {
        const container = new ima.AdDisplayContainer(box);
        displayContainer = container;
        container.initialize();
        const loader = new ima.AdsLoader(container);
        adsLoader = loader;

        loader.addEventListener(
          ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (event: { getAdsManager: (content: unknown, settings: unknown) => ImaAdsManager }) => {
            if (cancelled || done) return;
            const settings = new ima.AdsRenderingSettings();
            settings.restoreCustomPlaybackStateOnAdBreakComplete = true;
            // Pre-roll only: no content video to track.
            const manager = event.getAdsManager({ currentTime: 0, duration: 0 }, settings);
            adsManager = manager;
            manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish);
            for (const type of [
              ima.AdEvent.Type.ALL_ADS_COMPLETED,
              ima.AdEvent.Type.SKIPPED,
              ima.AdEvent.Type.USER_CLOSE,
              ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
            ]) {
              manager.addEventListener(type, finish);
            }
            manager.addEventListener(ima.AdEvent.Type.STARTED, () => {
              clearTimeout(timeout);
              markPrerollShown();
              setStarted(true);
              ticker = setInterval(() => {
                const left = manager.getRemainingTime();
                setRemaining(Number.isFinite(left) && left > 0 ? Math.ceil(left) : null);
                setSkipIn((s) => Math.max(0, s - 1));
              }, 1000);
            });
            try {
              manager.init(box.clientWidth, box.clientHeight, ima.ViewMode.NORMAL);
              manager.start();
            } catch {
              finish();
            }
            resizeObserver = new ResizeObserver(() =>
              manager.resize(box.clientWidth, box.clientHeight, ima.ViewMode.NORMAL),
            );
            resizeObserver.observe(box);
          },
          false,
        );
        loader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish, false);

        const request = new ima.AdsRequest();
        request.adTagUrl = prerollTagUrl();
        request.linearAdSlotWidth = box.clientWidth;
        request.linearAdSlotHeight = box.clientHeight;
        request.nonLinearAdSlotWidth = box.clientWidth;
        request.nonLinearAdSlotHeight = Math.round(box.clientHeight / 3);
        request.vastLoadTimeout = 6000;
        // Started by the visitor's click on Play.
        request.setAdWillAutoPlay(true);
        request.setAdWillPlayMuted(false);
        loader.requestAds(request);
      } catch {
        finish();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (ticker) clearInterval(ticker);
      resizeObserver?.disconnect();
      try {
        (adsManager as ImaAdsManager | null)?.destroy();
        (adsLoader as { destroy(): void } | null)?.destroy();
        (displayContainer as { destroy(): void } | null)?.destroy();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 z-20 bg-black">
      {/* IMA draws the ad (video + its own controls) in here */}
      <div ref={containerRef} className="absolute inset-0" />

      {!started && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          <span className="text-[11px] font-bold tracking-widest uppercase">{t("loading")}</span>
        </div>
      )}

      {started && (
        <>
          <span className="pointer-events-none absolute top-3 left-3 z-30 rounded-md bg-black/70 px-2 py-1 text-[10px] font-black tracking-widest text-amber-300 uppercase sm:top-4 sm:left-4">
            {t("label")}
            {remaining != null && <span className="ml-1.5 text-white/80">· {remaining} s</span>}
          </span>
          <button
            type="button"
            data-no-smartlink
            disabled={skipIn > 0}
            onClick={() => finishRef.current()}
            className="absolute right-3 bottom-14 z-30 flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-black/75 px-4 py-2.5 text-[11px] font-black tracking-wider text-white uppercase backdrop-blur-sm transition-colors hover:bg-white hover:text-black disabled:cursor-default disabled:opacity-80 disabled:hover:bg-black/75 disabled:hover:text-white sm:right-4 sm:bottom-16"
          >
            {skipIn > 0 ? (
              t("skipIn", { s: skipIn })
            ) : (
              <>
                {t("skip")}
                <SkipForward className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
