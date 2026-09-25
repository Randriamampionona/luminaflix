import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Globe, MonitorPlay, ShieldAlert, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getMovieTrailer } from "@/action/get-movie-trailer.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { PageShell } from "@/components/layout/page-shell";
import TrailerAdEngine from "@/components/trailer-ad-engine";
import { localeMeta, isLocale, type Locale } from "@/i18n/config";
import { getWatchHref, type MediaKind } from "@/lib/media";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ type?: string; fallback?: string; lang?: string }>;

const toKind = (value?: string): MediaKind => (value === "anime" ? "anime" : value === "tv" ? "tv" : "movie");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("trailer"), robots: { index: false } };
}

export default async function TrailerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp, uiLocale, t] = await Promise.all([params, searchParams, getLocale(), getTranslations("trailer")]);
  const kind = toKind(sp.type);
  const requested: Locale = isLocale(sp.lang) ? sp.lang : (uiLocale as Locale);

  const trailer = await getMovieTrailer(id, requested, kind);
  const currentLang: Locale = trailer?.lang === "fr" ? "fr" : trailer?.lang === "en" ? "en" : requested;
  const nextLang: Locale = currentLang === "fr" ? "en" : "fr";

  // BUG FIX: `fallback=undefined` used to be appended literally when missing.
  const watchHref = getWatchHref(id, kind, sp.fallback);
  const switchParams = new URLSearchParams({ lang: nextLang, type: kind });
  if (sp.fallback) switchParams.set("fallback", sp.fallback);

  return (
    <PageShell containerClassName="max-w-6xl">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="group flex min-w-0 items-center gap-4">
          <span className="rounded-xl border border-white/10 p-2 transition-all group-hover:border-cyan-500 group-hover:bg-cyan-500/5">
            <ChevronLeft className="h-5 w-5 text-zinc-500 group-hover:text-cyan-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{t("back")}</span>
        </Link>
        <Link
          href={watchHref}
          aria-label={t("start")}
          className="group rounded-full bg-white/5 p-2 transition-colors hover:bg-red-500/10"
        >
          <X className="h-6 w-6 text-zinc-600 transition-all duration-300 group-hover:rotate-90 group-hover:text-red-500" />
        </Link>
      </header>

      <div className="relative aspect-video max-h-[77vh] w-full overflow-hidden border border-white/5 bg-black shadow-[0_0_80px_-20px_rgba(6,182,212,0.15)]">
        {trailer?.key ? (
          <TrailerAdEngine trailerKey={trailer.key} lang={currentLang} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#050505] px-6 text-center">
            <ShieldAlert className="h-10 w-10 text-zinc-700" aria-hidden />
            <p className="text-sm text-zinc-500">{t("unavailable")}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-cyan-500/5 lg:col-span-8">
          <Link
            href={watchHref}
            className="flex w-full items-center justify-center gap-4 rounded-2xl bg-white py-6 text-black transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-[0.98]"
          >
            <MonitorPlay className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-[0.4em]">{t("start")}</span>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center gap-6 rounded-4xl border border-white/5 bg-white/2 p-8 backdrop-blur-sm lg:col-span-4">
          <Link
            href={`/trailer/${id}?${switchParams.toString()}`}
            className="w-full rounded-xl border border-white/10 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-all hover:border-cyan-500 hover:bg-cyan-500/5 hover:text-cyan-500"
          >
            {t("switchTo", { lang: localeMeta[nextLang].nativeName })}
          </Link>
          <p className="flex items-center gap-3">
            <Globe className="h-3 w-3 text-zinc-600" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              {t("language")}: {localeMeta[currentLang].nativeName}
            </span>
          </p>
        </div>
      </div>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
