import { useTranslations } from "next-intl";

/** Playback tip shown above the player. Works in server and client trees. */
export default function SignalMonitor() {
  const t = useTranslations("player");

  return (
    <div
      role="note"
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-4 transition-colors duration-500 hover:border-amber-500/30"
    >
      <div className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-amber-500/5 blur-[50px] transition-colors group-hover:bg-amber-500/10" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/90">
            {t("advisoryTitle")}
          </h4>
          <p className="text-xs leading-relaxed text-zinc-400">{t("advisoryBody")}</p>
        </div>
      </div>
    </div>
  );
}
