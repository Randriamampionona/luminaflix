import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/analytics/analytics-dashboard";
import AnalyticsForbidden from "@/components/analytics/forbidden";
import { PageShell } from "@/components/layout/page-shell";
import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import { getAnalyticsData, resolveRange } from "@/lib/analytics/queries";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

/**
 * Admin-only analytics dashboard. Security is enforced here, on the server:
 * proxy.ts only makes sure the visitor is signed in; this page then checks
 * the exact Clerk user id + verified email (lib/analytics/admin.ts) before
 * reading any data.
 */
export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await checkAnalyticsAdmin();
  if (access.status === "signed-out") redirect("/sign-in?redirect_url=%2Fanalytics");
  if (access.status === "forbidden") {
    return (
      <PageShell>
        <AnalyticsForbidden />
      </PageShell>
    );
  }

  const range = resolveRange(await searchParams);
  const data = await getAnalyticsData(range);

  return (
    <PageShell>
      <AnalyticsDashboard data={data} />
    </PageShell>
  );
}
