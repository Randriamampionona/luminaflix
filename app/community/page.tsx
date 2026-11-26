import { ArrowRight, Library, ShieldCheck, Sparkles, UploadCloud, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageAd from "@/components/ads/page-ad";
import CommunityRow from "@/components/community/community-row";
import WordTicker from "@/components/community/word-ticker";
import NewBadge from "@/components/whats-new/new-badge";
import { Container } from "@/components/layout/container";
import { getApprovedCommunity } from "@/lib/community/server";
import { toCardVideo } from "@/lib/community/types";

export async function generateMetadata(): Promise<Metadata> {
  const [t, tl] = await Promise.all([getTranslations("metadata.pages"), getTranslations("community.landing")]);
  return { title: t("community"), description: tl("description"), alternates: { canonical: "/community" } };
}

const STEP_ICONS = [UploadCloud, Sparkles, ShieldCheck, Users];

/** /community — what the community space is, with the two entry points (browse / upload). */
export default async function CommunityPage() {
  const [t, latest] = await Promise.all([getTranslations("community.landing"), getApprovedCommunity()]);
  const words = t.raw("words") as string[];
  const steps = t.raw("steps") as { title: string; body: string }[];

  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute top-40 -right-40 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <Container className="relative flex flex-col items-center gap-7 pt-36 pb-20 text-center sm:pt-44 sm:pb-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1.5 text-[10px] font-black tracking-[0.25em] text-violet-500 uppercase dark:text-violet-300">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {t("eyebrow")}
          </span>
          <h1 className="max-w-4xl text-4xl leading-[1.02] font-black tracking-tight text-foreground uppercase italic sm:text-6xl lg:text-7xl">
            {t("title")} <span className="text-brand">{t("accent")}</span>
            <span className="text-brand not-italic">.</span>
          </h1>
          <p className="max-w-2xl text-base text-fg-muted sm:text-lg">{t("description")}</p>

          <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/community/browse"
              className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-6 py-4 text-sm font-black text-black shadow-[0_14px_40px_-12px_rgba(6,182,212,0.8)] transition-colors hover:bg-cyan-400"
            >
              <Library className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex items-center gap-[0.35em] whitespace-nowrap">
                <span>{t("browsePrefix")}</span>
                <WordTicker words={words} align={t("browseSuffix") ? "center" : "left"} />
                {t("browseSuffix") && <span>{t("browseSuffix")}</span>}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/community/upload"
              className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-violet-500/50 bg-violet-500/10 px-6 py-4 text-sm font-black text-foreground transition-colors hover:bg-violet-500/20"
            >
              <UploadCloud className="h-5 w-5 shrink-0 text-violet-500 dark:text-violet-300" aria-hidden />
              <span className="flex items-center gap-[0.35em] whitespace-nowrap">
                <span>{t("uploadPrefix")}</span>
                <WordTicker words={words} interval={2600} />
              </span>
              <NewBadge feature="communityUpload" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Latest approved shares */}
      {latest.length > 0 ? (
        <CommunityRow title={t("latest")} videos={latest.slice(0, 18).map(toCardVideo)} />
      ) : (
        <Container className="py-12 text-center text-sm text-fg-muted">{t("empty")}</Container>
      )}

      {/* How it works */}
      <Container className="space-y-6 pt-8">
        <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic">
          {t("howTitle")}
          <span className="text-brand not-italic">.</span>
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Sparkles;
            return (
              <li key={step.title} className="space-y-3 rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-brand">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[10px] font-black tracking-widest text-fg-faint uppercase">0{i + 1}</span>
                </div>
                <h3 className="text-base font-black text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </Container>

      <Container className="pt-6">
        <PageAd />
      </Container>
    </main>
  );
}
