"use client";

import { RotateCw } from "lucide-react";

export default function OfflineActions({ retryLabel, homeLabel }: { retryLabel: string; homeLabel: string }) {
  return (
    <div className="relative mt-6 flex justify-center gap-2">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex cursor-pointer items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        {retryLabel}
      </button>
      {/* Full page load on purpose: it goes through the service worker. */}
      <button
        type="button"
        onClick={() => window.location.assign("/")}
        className="cursor-pointer rounded-2xl border border-line-strong px-5 py-3 text-[11px] font-black uppercase tracking-widest text-fg-muted transition-colors hover:text-foreground"
      >
        {homeLabel}
      </button>
    </div>
  );
}
