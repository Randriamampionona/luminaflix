"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

const AGE_KEY = "lf_community_adult_ok";
const noop = () => () => {};
const readConfirmed = () => {
  try {
    return sessionStorage.getItem(AGE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * The community player: DoodStream's embed in an <iframe> (no FR/EN servers).
 * 18+ videos first ask the visitor to confirm their age (remembered for the visit).
 */
export default function CommunityPlayer({
  embedUrl,
  title,
  adult,
}: {
  embedUrl: string;
  title: string;
  adult: boolean;
}) {
  const t = useTranslations("community.player");
  const [clicked, setClicked] = useState(false);
  // Already confirmed earlier in this visit (read after hydration; the server renders the question).
  const remembered = useSyncExternalStore(noop, readConfirmed, () => false);
  const confirmed = !adult || clicked || remembered;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-black shadow-[0_30px_80px_-30px_rgba(6,182,212,0.45)]">
      {confirmed ? (
        <iframe
          src={embedUrl}
          title={title}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="origin"
          className="block aspect-video w-full"
        />
      ) : (
        <div
          data-no-smartlink
          className="flex aspect-video w-full flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 text-red-400">
            <ShieldAlert className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-black text-white">{t("ageTitle")}</p>
          <p className="max-w-md text-sm text-white/70">{t("ageBody")}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem(AGE_KEY, "1");
                } catch {
                  // ignore
                }
                setClicked(true);
              }}
              className="rounded-2xl bg-red-600 px-5 py-3 text-xs font-black tracking-widest text-white uppercase hover:bg-red-500"
            >
              {t("ageConfirm")}
            </button>
            <button
              type="button"
              onClick={() => history.back()}
              className="rounded-2xl border border-white/25 px-5 py-3 text-xs font-black tracking-widest text-white uppercase hover:bg-white/10"
            >
              {t("ageBack")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
