import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AnalyticsForbidden from "@/components/analytics/forbidden";
import ReviewDashboard from "@/components/community/review-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import { getCommunityReviewData } from "@/lib/community/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("communityReview"), robots: { index: false, follow: false } };
}

/** /community/review — admin only: metrics, preview, approve / decline, Standard / 18+. */
export default async function CommunityReviewPage() {
  const access = await checkAnalyticsAdmin();
  if (access.status === "signed-out") redirect("/sign-in?redirect_url=%2Fcommunity%2Freview");
  if (access.status === "forbidden") {
    return (
      <PageShell>
        <AnalyticsForbidden />
      </PageShell>
    );
  }
  const [t, data] = await Promise.all([getTranslations("community.review"), getCommunityReviewData()]);

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("description")} />
      <ReviewDashboard data={data} />
    </PageShell>
  );
}
