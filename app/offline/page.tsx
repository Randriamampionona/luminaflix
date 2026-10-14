import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import OfflineActions from "@/components/pwa/offline-actions";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker when a page can't be loaded and isn't cached. */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <PageShell>
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line-strong bg-surface p-8 text-center shadow-2xl">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
          />
          <p className="relative text-5xl" aria-hidden>
            📡
          </p>
          <h1 className="relative mt-4 text-2xl font-black tracking-tight text-foreground">{t("title")}</h1>
          <p className="relative mt-2 text-sm leading-relaxed text-fg-muted">{t("body")}</p>
          <OfflineActions retryLabel={t("retry")} homeLabel={t("home")} />
        </div>
      </div>
    </PageShell>
  );
}
