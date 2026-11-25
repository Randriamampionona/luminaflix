import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MediaGrid } from "@/components/layout/media-grid";
import { findApprovedCommunity } from "@/lib/community/server";
import { toCardVideo, type CommunityCategory } from "@/lib/community/types";
import type { SearchScopeKey } from "@/lib/search/scopes";
import CommunityCard from "./community-card";

const SHOWN = 6;

/** "Community" block at the top of /search/[query]: approved uploads matching the query. */
export default async function CommunitySearchSection({ query, scope }: { query: string; scope: SearchScopeKey }) {
  const category = scope === "all" ? undefined : (scope as CommunityCategory);
  const [t, videos] = await Promise.all([getTranslations("community"), findApprovedCommunity({ category, query })]);
  if (videos.length === 0) return null;

  const more = new URLSearchParams({ q: query });
  if (category) more.set("type", category);

  return (
    <section
      aria-labelledby="search-community"
      className="space-y-5 rounded-3xl border border-violet-500/30 bg-violet-500/5 p-4 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="search-community"
          className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground uppercase italic"
        >
          <Users className="h-5 w-5 text-violet-500 not-italic dark:text-violet-300" aria-hidden />
          {t("searchTitle")}
          <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white not-italic">
            {videos.length}
          </span>
        </h2>
        {videos.length > SHOWN && (
          <Link
            href={`/community/browse?${more}`}
            className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-brand-bright"
          >
            {t("searchMore")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <MediaGrid>
        {videos.slice(0, SHOWN).map((video) => (
          <CommunityCard key={video.id} video={toCardVideo(video)} />
        ))}
      </MediaGrid>
    </section>
  );
}
