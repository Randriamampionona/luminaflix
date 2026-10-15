import type { Metadata } from "next";
import {
  BellRing,
  Feather,
  MonitorPlay,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import AnimatedLogo from "@/components/brand/animated-logo";
import InstallCta from "@/components/download-app/install-cta";
import PlatformGuide from "@/components/download-app/platform-guide";
import { PageShell } from "@/components/layout/page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("downloadApp");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const FEATURES: { key: string; icon: LucideIcon }[] = [
  { key: "fast", icon: Zap },
  { key: "fullscreen", icon: MonitorPlay },
  { key: "notifications", icon: BellRing },
  { key: "light", icon: Feather },
  { key: "updates", icon: RefreshCcw },
  { key: "safe", icon: ShieldCheck },
];

/** /download_app — the LuminaFlix app (PWA) landing page. */
export default async function DownloadAppPage() {
  const t = await getTranslations("downloadApp");

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative grid items-center gap-12 overflow-hidden rounded-[2.5rem] border border-line bg-surface px-6 py-12 sm:px-12 lg:grid-cols-2 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-32 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl"
        />

        <div className="relative space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black tracking-[0.25em] text-brand uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("eyebrow")}
          </span>
          <h1 className="text-4xl leading-[0.95] font-black tracking-tighter text-foreground uppercase italic sm:text-6xl">
            {t("title")}
            <span className="text-brand">.</span>
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-fg-muted lg:mx-0">{t("subtitle")}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <InstallCta />
          </div>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-fg-subtle lg:justify-start">
            {(["free", "noStore", "size"] as const).map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden />
                {t(`badges.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Phone mock-up with the app starting up */}
        <div className="relative mx-auto" aria-hidden>
          <div className="relative h-[30rem] w-60 rounded-[2.75rem] border-[10px] border-zinc-900 bg-[#020202] shadow-[0_40px_120px_-30px_rgba(6,182,212,0.55)] ring-1 ring-white/10 sm:w-64">
            <div className="absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-zinc-900" />
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <AnimatedLogo size={96} />
              <p className="text-xl font-black tracking-tighter text-white uppercase italic">
                Lumina<span className="text-cyan-400">Flix</span>
              </p>
              <div className="h-1 w-28 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/5 rounded-full bg-cyan-400 animate-[lf-boot-bar_1.1s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
          {/* Floating notification */}
          <div className="absolute top-16 -left-10 w-60 rounded-2xl border border-white/10 bg-zinc-900/90 p-3 text-left shadow-2xl backdrop-blur sm:-left-24">
            <div className="flex items-center gap-2.5">
              <AnimatedLogo size={30} animated={false} background />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-zinc-400">{t("mockApp")}</p>
                <p className="truncate text-xs font-bold text-white">{t("mockTitle")}</p>
              </div>
            </div>
          </div>
          {/* Home-screen icon */}
          <div className="absolute -right-6 bottom-20 flex flex-col items-center gap-1.5 sm:-right-12">
            <div className="rounded-[1.1rem] shadow-xl ring-1 ring-white/10">
              <AnimatedLogo size={64} animated={false} background />
            </div>
            <span className="text-[10px] font-semibold text-fg-muted">LuminaFlix</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-black tracking-tight text-foreground uppercase italic sm:text-3xl">
          {t("featuresTitle")}
          <span className="text-brand">.</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="group rounded-3xl border border-line bg-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-cyan-500/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-brand transition-transform group-hover:scale-110">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-black text-foreground">
                {t(`features.${key}.title` as "features.fast.title")}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {t(`features.${key}.body` as "features.fast.body")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Install guide */}
      <section id="install-guide" className="scroll-mt-28 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic sm:text-3xl">
            {t("guideTitle")}
            <span className="text-brand">.</span>
          </h2>
          <p className="mt-2 text-sm text-fg-muted">{t("guideSubtitle")}</p>
        </div>
        <PlatformGuide />
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl space-y-3">
        <h2 className="mb-6 text-center text-2xl font-black tracking-tight text-foreground uppercase italic sm:text-3xl">
          {t("faqTitle")}
          <span className="text-brand">.</span>
        </h2>
        {([1, 2, 3, 4] as const).map((n) => (
          <details key={n} className="group rounded-2xl border border-line bg-surface p-5 open:border-cyan-500/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-foreground">
              {t(`faq.q${n}`)}
              <span className="text-brand transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t(`faq.a${n}`)}</p>
          </details>
        ))}
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-cyan-500/30 bg-cyan-500/5 px-6 py-12 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-2/3 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl"
        />
        <div className="relative flex flex-col items-center gap-5">
          <Smartphone className="h-10 w-10 text-brand" aria-hidden />
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic sm:text-3xl">
            {t("finalTitle")}
          </h2>
          <p className="max-w-md text-sm text-fg-muted">{t("finalBody")}</p>
          <InstallCta size="md" />
        </div>
      </section>
    </PageShell>
  );
}
