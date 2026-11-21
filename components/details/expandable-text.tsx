"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Long synopsis: 4 lines, then "Show more". */
export default function ExpandableText({ text, more, less }: { text: string; more: string; less: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320;
  return (
    <div className="space-y-1.5">
      <p className={cn("text-sm leading-relaxed text-foreground/85 sm:text-base", long && !open && "line-clamp-4")}>
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-brand-bright hover:underline"
        >
          {open ? less : more}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  );
}
