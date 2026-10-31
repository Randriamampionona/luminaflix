"use client";

import Image from "next/image";
import { ChevronRight, Film, Loader2, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPreviewTrailer } from "@/action/get-preview-trailer.action";
import { getPref } from "@/lib/user-prefs";

const HOVER_DELAY_MS = 650;
const LONG_PRESS_MS = 500;
const keys = new Map<string, string | null>();
/** Only one preview at a time. */
let closeCurrent: (() => void) | null = null;

interface PreviewInfo {
  title: string;
  year?: string | null;
  rating?: number | null;
  backdrop?: string | null;
  /** Opens the title's details (click on the preview). */
  onOpen: () => void;
}

type State = { status: "loading" | "unavailable" } | { status: "playing"; key: string };
interface Box {
  left: number;
  top: number;
  width: number;
}

async function trailerKey(id: number, kind: string) {
  const cacheKey = `${kind}:${id}`;
  if (keys.has(cacheKey)) return keys.get(cacheKey) ?? null;
  const key = await getPreviewTrailer(id, kind).catch(() => null);
  keys.set(cacheKey, key);
  return key;
}

/** Popover size and place: centred on the card, wider than it, always inside the screen. */
function boxFor(card: HTMLElement): Box {
  const rect = card.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width * 1.9, 300), 440, window.innerWidth - 16);
  const height = (width * 9) / 16 + 76;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 8), window.innerWidth - width - 8);
  const top = Math.min(Math.max(rect.top + rect.height / 2 - height / 2, 8), window.innerHeight - height - 8);
  return { left, top, width };
}

/**
 * Trailer preview of a card: after a short hover (mouse) or a long press
 * (touch), a 16:9 box opens over the card with the muted trailer — or
 * "Trailer not available". Click it to open the title. Never with data saver
 * or reduced motion.
 */
export function useHoverTrailer(id: number, kind: string, info: PreviewInfo) {
  const t = useTranslations("preview");
  const cardRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [state, setState] = useState<State>({ status: "loading" });
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const touchOpened = useRef(false);

  const close = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    setBox(null);
  }, []);

  const start = useCallback(
    (delay: number, touch: boolean) => {
      if (getPref("dataSaver") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = setTimeout(async () => {
        const card = cardRef.current;
        if (!card) return;
        closeCurrent?.();
        closeCurrent = close;
        longPressed.current = touch;
        touchOpened.current = touch;
        setState({ status: "loading" });
        setBox(boxFor(card));
        const key = await trailerKey(id, kind);
        setState(key ? { status: "playing", key } : { status: "unavailable" });
      }, delay);
    },
    [id, kind, close],
  );

  const scheduleClose = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(close, 160);
  }, [close]);

  // Close on scroll / resize (the box would drift) and, after a long press, on any outside tap.
  useEffect(() => {
    if (!box) return;
    const onOutside = (e: PointerEvent) => {
      if (touchOpened.current && !(e.target as Element).closest?.("[data-trailer-preview]")) close();
    };
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [box, close]);

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const handlers = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && start(HOVER_DELAY_MS, false),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && scheduleClose(),
    onTouchStart: () => start(LONG_PRESS_MS, true),
    onTouchMove: () => {
      if (!box && openTimer.current) close();
    },
    onTouchEnd: () => {
      if (!box && openTimer.current) close();
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (openTimer.current || box) e.preventDefault();
    },
    /** The tap that ends a long press doesn't open the card. */
    onClickCapture: (e: React.MouseEvent) => {
      if (longPressed.current && box) {
        e.stopPropagation();
        e.preventDefault();
        longPressed.current = false;
      }
    },
  };

  const backdrop = info.backdrop ? `https://image.tmdb.org/t/p/w780${info.backdrop}` : null;
  const popover =
    box && typeof document !== "undefined"
      ? createPortal(
          <div
            data-trailer-preview
            role="button"
            tabIndex={-1}
            aria-label={info.title}
            onPointerEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
            onPointerLeave={(e) => e.pointerType === "mouse" && scheduleClose()}
            onClick={() => {
              close();
              info.onOpen();
            }}
            style={{ left: box.left, top: box.top, width: box.width }}
            className="fixed z-[70] cursor-pointer overflow-hidden rounded-2xl border border-line-strong bg-elevated shadow-[0_30px_80px_-10px_rgba(0,0,0,0.75)] ring-1 ring-cyan-500/20 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {backdrop && state.status !== "playing" && (
                <Image
                  src={backdrop}
                  alt=""
                  fill
                  sizes="440px"
                  className={
                    state.status === "unavailable" ? "object-cover opacity-30 blur-[2px]" : "object-cover opacity-60"
                  }
                />
              )}
              {state.status === "loading" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-white/90" aria-label={t("loading")} />
                </span>
              )}
              {state.status === "unavailable" && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <Film className="h-7 w-7 text-white/70" aria-hidden />
                  <span className="text-sm font-bold text-white">{t("unavailable")}</span>
                </span>
              )}
              {state.status === "playing" && (
                <iframe
                  title={t("label", { title: info.title })}
                  src={`https://www.youtube-nocookie.com/embed/${state.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${state.key}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1`}
                  allow="autoplay; encrypted-media"
                  tabIndex={-1}
                  className="pointer-events-none absolute inset-0 h-full w-full border-0"
                />
              )}
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-foreground">{info.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-fg-subtle">
                  {info.year && <span>{info.year}</span>}
                  {!!info.rating && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      {info.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="truncate">{t("moreInfo")}</span>
                </p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-black">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>,
          document.body,
        )
      : null;

  return { cardRef, handlers, popover };
}
