"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toSearchScope } from "@/lib/search/scopes";
import SearchPanel from "./search-panel";

/** Client part of /search: the shared panel, full page. */
export default function SearchPage({ initialQuery, initialType }: { initialQuery: string; initialType: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  const scope = toSearchScope(initialType);
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic sm:text-4xl">
        {t("pageTitle")}
        <span className="text-brand not-italic">.</span>
      </h1>
      <SearchPanel
        variant="page"
        onNavigate={(path) => router.push(path)}
        initialQuery={initialQuery}
        initialScope={scope}
      />
    </div>
  );
}
