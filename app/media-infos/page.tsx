import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AnalyticsForbidden from "@/components/analytics/forbidden";
import { PageShell } from "@/components/layout/page-shell";
import MediaInfosExplorer from "@/components/media-infos/media-infos-explorer";
import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import type { InfoKind } from "@/lib/media-infos";

export const metadata: Metadata = { title: "Media infos", robots: { index: false, follow: false } };

type SearchParams = Promise<{ type?: string; id?: string }>;

/** Admin-only lookup of any movie / anime / K-drama by TMDB or IMDb id (same access rule as /analytics). */
export default async function MediaInfosPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await checkAnalyticsAdmin();
  if (access.status === "signed-out") redirect("/sign-in?redirect_url=%2Fmedia-infos");
  if (access.status === "forbidden") {
    return (
      <PageShell>
        <AnalyticsForbidden />
      </PageShell>
    );
  }

  const { type, id } = await searchParams;
  const kind: InfoKind = type === "anime" || type === "kdrama" || type === "tv" ? type : "movie";
  return (
    <PageShell>
      <MediaInfosExplorer initialKind={kind} initialId={id ?? ""} />
    </PageShell>
  );
}
