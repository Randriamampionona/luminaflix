/**
 * Shared typography scale. Every page heading uses these tokens so weight,
 * tracking and responsive sizes stay identical across routes.
 */
export const type = {
  /** Hero / marquee titles (home slider, details hero). */
  display:
    "text-4xl sm:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-[0.95] text-foreground",
  /** One per page. */
  h1: "text-4xl sm:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none text-foreground",
  /** Section titles (rows, blocks). */
  h2: "text-xl sm:text-2xl lg:text-3xl font-black uppercase italic tracking-tighter leading-tight text-foreground",
  /** Card / sub-section titles. */
  h3: "text-base sm:text-lg font-black uppercase italic tracking-tight leading-snug text-foreground",
  /** Small label above a heading. */
  eyebrow: "text-[10px] font-black uppercase tracking-[0.3em] text-brand",
  /** Paragraph copy. */
  body: "text-sm sm:text-base leading-relaxed text-fg-muted",
  /** Secondary metadata (counts, dates). */
  meta: "text-[10px] font-bold uppercase tracking-[0.2em] text-fg-subtle",
  /** Long-form prose (legal, help). */
  prose: "text-sm sm:text-[15px] leading-7 text-fg-soft",
} as const;

/** Vertical rhythm between page sections. */
export const spacing = {
  pageTop: "pt-28 sm:pt-32",
  pageBottom: "pb-16 sm:pb-24",
  section: "py-10 sm:py-14",
  stack: "space-y-10 sm:space-y-14",
} as const;
