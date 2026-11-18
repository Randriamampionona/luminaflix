"use client";

import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  loadIma,
  markPrerollShown,
  prerollLog,
  prerollTagUrl,
  PREROLL_TIMEOUT_MS,
  PREROLL_VAST_TIMEOUT_MS,
  type ImaAdsManager,
  type PreparedAdDisplay,
} from "@/lib/preroll";

/**
 * The video ad before the movie (VAST through Google's IMA SDK). IMA draws the
 * ad in `slot` — a box inside the player that exists before the click, so the
 * display could be prepared in the Play click itself (`prepared`). This
 * component adds the label, the remaining time and the sound button — skipping
 * is only through the ad's own "Skip" button (when the ad allows it, as set by
 * the advertiser) — and calls `onDone` once: ad finished, skipped, failed, or
 * nothing started in 12 s.
 * The ad plays in its own box, before the provider's iframe is loaded — the
 * iframe player is never involved.
 */
export default function PrerollAd({
  slot,
  prepared,
  onDone,
}: {
  slot: HTMLDivElement | null;
  prepared: PreparedAdDisplay | null;
  onDone: () => void;
}) {
  const t = useTranslations("player.preroll");
  const onDoneRef = useRef(onDone);
  const managerRef = useRef<ImaAdsManager | null>(null);
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [muted, setMuted] = useState(!prepared);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;
    let done = false;
    let adsManager: ImaAdsManager | null = null;
    let adsLoader: { destroy(): void } | null = null;
    let display: { destroy(): void } | null = prepared?.container ?? null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const finish = (reason: string) => {
      if (done) return;
      done = true;
      prerollLog(`end → movie (${reason})`);
      onDoneRef.current();
    };
    const timeout = setTimeout(() => finish(`no ad started within ${PREROLL_TIMEOUT_MS / 1000} s`), PREROLL_TIMEOUT_MS);

    const run = async () => {
      const ima = prepared?.ima ?? (await loadIma());
      if (cancelled || done) return;
      if (!ima || !slot) return finish(ima ? "no ad box" : "IMA SDK unavailable");
      // Without the click's preparation (SDK not loaded yet at that moment), browsers
      // only allow a muted start.
      const playMuted = !prepared;
      try {
        if (!display) {
          const container = new ima.AdDisplayContainer(slot);
          container.initialize();
          display = container;
        }
        const loader = new ima.AdsLoader(display);
        adsLoader = loader;

        loader.addEventListener(
          ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (event: { getAdsManager: (content: unknown, settings: unknown) => ImaAdsManager }) => {
            if (cancelled || done) return;
            prerollLog("ad received");
            const settings = new ima.AdsRenderingSettings();
            settings.restoreCustomPlaybackStateOnAdBreakComplete = true;
            // Pre-roll only: no content video to track.
            const manager = event.getAdsManager({ currentTime: 0, duration: 0 }, settings);
            adsManager = manager;
            managerRef.current = manager;
            manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (e: { getError?: () => unknown }) =>
              finish(`ad error: ${String(e?.getError?.() ?? "unknown")}`),
            );
            manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => finish("ad finished"));
            manager.addEventListener(ima.AdEvent.Type.SKIPPED, () => finish("skipped by the visitor"));
            manager.addEventListener(ima.AdEvent.Type.USER_CLOSE, () => finish("closed"));
            manager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => finish("ad break over"));
            manager.addEventListener(ima.AdEvent.Type.STARTED, () => {
              clearTimeout(timeout);
              prerollLog("ad started");
              markPrerollShown();
              setStarted(true);
              ticker = setInterval(() => {
                const left = manager.getRemainingTime();
                setRemaining(Number.isFinite(left) && left > 0 ? Math.ceil(left) : null);
              }, 1000);
            });
            try {
              manager.init(slot.clientWidth || 640, slot.clientHeight || 360, ima.ViewMode.NORMAL);
              if (playMuted) manager.setVolume(0);
              manager.start();
            } catch (error) {
              finish(`could not start the ad: ${String(error)}`);
            }
            resizeObserver = new ResizeObserver(() =>
              manager.resize(slot.clientWidth, slot.clientHeight, ima.ViewMode.NORMAL),
            );
            resizeObserver.observe(slot);
          },
          false,
        );
        loader.addEventListener(
          ima.AdErrorEvent.Type.AD_ERROR,
          (e: { getError?: () => unknown }) => finish(`no ad: ${String(e?.getError?.() ?? "VAST error")}`),
          false,
        );

        const request = new ima.AdsRequest();
        request.adTagUrl = prerollTagUrl();
        request.linearAdSlotWidth = slot.clientWidth || 640;
        request.linearAdSlotHeight = slot.clientHeight || 360;
        request.nonLinearAdSlotWidth = slot.clientWidth || 640;
        request.nonLinearAdSlotHeight = Math.round((slot.clientHeight || 360) / 3);
        request.vastLoadTimeout = PREROLL_VAST_TIMEOUT_MS;
        request.setAdWillAutoPlay(true);
        request.setAdWillPlayMuted(playMuted);
        prerollLog("requesting an ad", { prepared: !!prepared, muted: playMuted });
        loader.requestAds(request);
      } catch (error) {
        finish(`IMA error: ${String(error)}`);
      }
    };
    void run();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (ticker) clearInterval(ticker);
      resizeObserver?.disconnect();
      managerRef.current = null;
      try {
        (adsManager as ImaAdsManager | null)?.destroy();
        (adsLoader as { destroy(): void } | null)?.destroy();
        (display as { destroy(): void } | null)?.destroy();
      } catch {
        // ignore
      }
    };
  }, [slot, prepared]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white/80">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          <span className="text-[11px] font-bold tracking-widest uppercase">{t("loading")}</span>
        </div>
      )}

      {started && (
        <>
          <span className="absolute top-3 left-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-black tracking-widest text-amber-300 uppercase sm:top-4 sm:left-4">
            {t("label")}
            {remaining != null && <span className="ml-1.5 text-white/80">· {remaining} s</span>}
          </span>
          {muted && (
            <button
              type="button"
              data-no-smartlink
              onClick={() => {
                managerRef.current?.setVolume(1);
                setMuted(false);
              }}
              aria-label={t("unmute")}
              className="pointer-events-auto absolute top-3 right-3 flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-black/75 px-3 py-2 text-[11px] font-black text-white uppercase backdrop-blur-sm hover:bg-white hover:text-black sm:top-4 sm:right-4"
            >
              <VolumeX className="h-4 w-4" aria-hidden />
              {t("unmute")}
            </button>
          )}
          {!muted && (
            <button
              type="button"
              data-no-smartlink
              onClick={() => {
                managerRef.current?.setVolume(0);
                setMuted(true);
              }}
              aria-label={t("mute")}
              className="pointer-events-auto absolute top-3 right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-black/75 text-white backdrop-blur-sm hover:bg-white hover:text-black sm:top-4 sm:right-4"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </>
      )}
    </div>
  );
}
