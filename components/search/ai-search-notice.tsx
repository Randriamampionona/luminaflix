import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SmartSearchResult } from "@/lib/search/smart-search";

/**
 * Shown when results come from AI-inferred titles: what the AI understood,
 * plus a one-click way back to a plain search for the exact words.
 */
export default async function AiSearchNotice({ ai, exactHref }: { ai: SmartSearchResult["ai"]; exactHref: string }) {
  if (!ai) return null;
  const t = await getTranslations("search.smart");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-black">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-fg-soft">
            <span className="font-black uppercase tracking-widest text-brand">{t("noticeTitle")}</span>
            <span className="text-fg-faint"> · </span>
            {t("noticeBody")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {ai.titles.map((title) => (
              <li
                key={title}
                className="rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-bold text-foreground"
              >
                {title}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link
        href={exactHref}
        className="shrink-0 text-[11px] font-bold text-fg-muted underline-offset-4 hover:text-brand hover:underline"
      >
        {t("exact")}
      </Link>
    </div>
  );
}