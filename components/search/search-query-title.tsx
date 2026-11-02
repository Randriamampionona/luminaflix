"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { searchResultsHref, type SearchScopeKey } from "@/lib/search/scopes";

/**
 * Title of /search/[query]: “query” with a small edit button. Editing turns it
 * into a field holding the current search; Enter or ✓ relaunches the search
 * (same section and AI setting), Escape or ✕ cancels.
 */
export default function SearchQueryTitle({
  query,
  scope,
  aiOff,
}: {
  query: string;
  scope: SearchScopeKey;
  aiOff: boolean;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setValue(query);
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  if (!editing) {
    return (
      <span className="inline-flex max-w-full items-center gap-3">
        <span className="wrap-break-word">“{query}”</span>
        <button
          type="button"
          onClick={startEditing}
          aria-label={t("editQuery")}
          title={t("editQuery")}
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-tint align-middle text-fg-muted not-italic transition-colors hover:border-cyan-500/60 hover:text-brand sm:h-10 sm:w-10"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = value.trim();
        if (!clean) return;
        setEditing(false);
        if (clean !== query) router.push(searchResultsHref(clean, { ai: !aiOff, scope }));
      }}
      className="inline-flex w-[calc(100%-1.5rem)] max-w-2xl items-center gap-2 rounded-2xl align-middle border border-cyan-500/50 bg-background/70 py-1.5 pr-1.5 pl-4 text-base not-italic ring-4 ring-cyan-500/10"
    >
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        aria-label={t("editQuery")}
        className="min-w-0 flex-1 bg-transparent py-2 text-lg font-bold tracking-normal text-foreground normal-case outline-none sm:text-2xl [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label={t("cancelEdit")}
        className="cursor-pointer rounded-xl p-2.5 text-fg-subtle transition-colors hover:bg-tint hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="submit"
        disabled={!value.trim()}
        aria-label={t("submit")}
        className="flex cursor-pointer items-center gap-2 rounded-xl bg-cyan-500 px-3.5 py-2.5 text-[10px] font-black tracking-widest text-black uppercase transition-colors hover:bg-cyan-400 disabled:opacity-40"
      >
        <Check className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{t("submit")}</span>
      </button>
    </form>
  );
}
