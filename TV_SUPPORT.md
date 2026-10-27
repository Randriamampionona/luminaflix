# Smart TV & legacy browser support

Two levels:
- **Full app (JavaScript)** — Chromium 80+, Safari 14.1+, Firefox 90+ (`browserslist` in package.json):
  Samsung Tizen 6.5+ (2022+), LG webOS 22+, Android TV / Fire TV with an updated browser.
  These engines run `?.`, `??` and `#private` natively, so the compiler never rewrites them
  (rewriting them for older engines hits an SWC bug: "assignment to undeclared variable _x").
- **Styled pages (CSS)** — down to Chromium 56 / Safari 12 (`browsers` in postcss.config.mjs):
  on older TVs pages still render properly from the server and links work, even if the
  interactive parts (player, popups) can't run.

## Why the UI broke
Tailwind v4 output targets recent browsers only:
- utilities live in `@layer` blocks — **Chromium < 99 ignores every rule inside**, so
  the page was almost unstyled;
- `padding-inline` / `margin-inline` (px/py/mx/my utilities), `inset`, `translate` /
  `scale` / `rotate` properties, `:where()` / `:is()`, `aspect-ratio`, `100dvh`, `@property`;
- the JavaScript used `?.`, `??`, `catch {}`… → a syntax error on old engines and React never started.

## What the build does now
1. **`browserslist`** (package.json) — the JavaScript targets (see above). Don't lower it below
   Chromium 80 / Safari 14.1 / Firefox 90: the compiler's rewrite of `??` / `?.` / private fields
   can produce code that crashes ("assignment to undeclared variable").
2. **`postcss.config.mjs`**:
   - Tailwind v4;
   - **postcss-preset-env** — removes cascade layers (same priority via specificity),
     converts logical properties, nesting and media ranges, adds vendor prefixes (autoprefixer);
   - **`postcss/legacy-tv.cjs`** — `inset` → top/right/bottom/left, `dvh` → `vh`, `gap` → `grid-gap`,
     `translate/scale/rotate` → `transform`, `:where()/:is()` → plain selectors, `aspect-ratio` →
     padding box, Tailwind's `@property` defaults.
   Every fallback is written *before* the modern rule or inside `@supports not (…)`, so modern
   browsers render exactly as before (checked pixel by pixel).
3. **`components/tv/legacy-support.tsx`** (in the root layout):
   - adds `tv` to `<html>` on TV browsers and `legacy-css` on old engines (before first paint);
   - flexbox `gap` polyfill for engines without it (Chromium < 84) — turns gaps into margins.
4. **`app/globals.css`** — TV rules: UI scaled with the screen width (1080p ×1.125, 4K ×2),
   no horizontal scroll (no TV auto-zoom-out), no `backdrop-filter` blur (slow TV GPUs),
   visible focus ring for remote navigation, no text auto-inflation.
5. Viewport: `width=device-width, initial-scale=1, minimum-scale=1`.

## Testing on a TV
Open the site on the TV, or emulate one in Chrome DevTools (custom device 1920×1080, user agent
containing `SMART-TV; Tizen`): `<html>` should have the `tv` class.
