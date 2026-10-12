import Link from "next/link";
import { ShieldAlert } from "lucide-react";

/** 403 shown to signed-in users who aren't the analytics admin. */
export default function AnalyticsForbidden() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line-strong bg-surface p-8 text-center shadow-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-red-500/20 blur-3xl"
        />
        <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </span>
        <p className="relative mt-5 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Error 403</p>
        <h1 className="relative mt-2 text-2xl font-black tracking-tight text-foreground">Access restricted</h1>
        <p className="relative mt-2 text-sm leading-relaxed text-fg-muted">
          This area is reserved for the LuminaFlix administrator.
        </p>
        <Link
          href="/"
          className="relative mt-6 inline-flex rounded-2xl bg-cyan-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
