# LuminaFlix — audit & refactor report

Scope: every page, component, server action and API route of the Next.js 16 + Clerk + Firebase + TMDB app.
Brand kept as **LuminaFlix** (the name used throughout the code).

**Verification on the final code:** `tsc --noEmit` clean · `eslint .` clean · `node scripts/check-locales.mjs` → fr/en parity (457 keys) · `next build` succeeds (29 routes) · smoke-tested with `next start`: FR rendering, legacy `?display_lang=` redirect + cookie, `/sign-in?redirect_url=/k-drama/play/42?s=2&e=5` forwarded to Clerk, external `redirect_url` rejected (falls back to `/`).

Deliverables in this folder:

| File | Content |
|---|---|
| `luminaflix-refactor.zip` | Full project (no `node_modules`, no `.next`) |
| `luminaflix-refactor.patch` | `git diff` against the uploaded code — apply with `git apply luminaflix-refactor.patch` |
| `luminaflix-source.md` | Full content of all 125 new/modified files, relative path above each block |
| `REFACTOR_REPORT.md` | This document |

---

## 1. Setup after pulling

```bash
yarn install            # adds next-intl, sonner, @clerk/localizations
```

Environment variables (add to `.env.local` / Vercel):

| Variable | Required | Purpose |
|---|---|---|
| `BREVO_API_KEY` | yes (already used by the daily digest) | Sends contact-form emails |
| `CONTACT_TO_EMAIL` | no — defaults to `tojorandria474@gmail.com` | Recipient of contact messages (never exposed to the browser) |
| `CONTACT_FROM_EMAIL` | no — defaults to `tojorandria474@gmail.com` | Sender; **must be a verified sender in Brevo** |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` | recommended | Clerk uses your own sign-in page |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` | recommended | Same for sign-up |

Nothing else changes in deployment. Stream providers are **unchanged** (moved verbatim to `components/player/providers.ts`).

---

## 2. Performance

| Problem found | Fix | Files |
|---|---|---|
| Home page ran 6 TMDB requests one after another | `Promise.all` | `app/page.tsx` |
| Every TMDB call was `cache: "no-store"` + `force-dynamic` on every page | Central `tmdb()` helper with `next.revalidate` (15 min / 1 h / 24 h by content type); `force-dynamic` removed | `lib/tmdb.ts`, all `action/*` |
| `/genres/[id]` fired ~20 discover requests just to read one genre name | Single cached `/genre/movie/list` lookup | `action/get-all-genres.action.ts`, `app/genres/[id]/page.tsx` |
| One Radix Dialog mounted per movie card (~60 on the home page) | One shared dialog via context | `components/media/media-details-provider.tsx`, `movie-details.tsx`, `movie-card.tsx` |
| Cards/rows re-rendered on every parent update | `React.memo` + stable callbacks | `movie-card.tsx`, `movie-row.tsx`, `favorite-card.tsx`, `stream-action-suite.tsx` |
| `<img>` with TMDB `original` (4K) images everywhere | `next/image` with explicit `sizes`, `priority` only above the fold, custom loader mapping to TMDB size buckets (w92…w1280) | `lib/tmdb-image-loader.ts`, `next.config.ts`, all image components |
| Long grids fully laid out | Capped at one TMDB page per route + `content-visibility: auto` on grid items; skeleton fallback via `app/loading.tsx` | `components/layout/media-grid.tsx`, `app/globals.css`, `components/layout/skeletons.tsx` |
| Episode list rendered hundreds of cards at once; race condition when switching seasons; spinner could stay stuck | Batches of 24 + IntersectionObserver; request-id guard | `components/episode-explorer.tsx` |
| Raw scroll listener calling `setState` on every event | Passive, rAF-throttled, only updates when the value flips | `hooks/use-scrolled.ts` |
| Hero `setInterval` not reset on manual navigation; ran in background tabs | Timeout keyed on the active slide, paused when hidden / reduced motion | `components/hero-slider.tsx` |
| Trailer pre-roll timers torn down and recreated every second | One interval per phase, always cleared | `components/trailer-ad-engine.tsx` |
| `display_lang` param on every link (a `useSearchParams` + Suspense per link) | Removed; locale lives in a cookie | deleted `components/custom-link.tsx` |
| Three ~95% duplicated players; artificial 500 ms delay in search; duplicate Cmd+K listener; `console.log` in player | Single `StreamPlayer`; delay and duplicate removed | `components/player/*`, `search-hub.tsx`, `navbar-actions.tsx` |

## 3. Internationalization

- **Library:** `next-intl` without locale-prefixed URLs. The locale is stored in the `NEXT_LOCALE` cookie (1 year) and read on the server, so the first paint is already translated. First visit falls back to `Accept-Language`.
- **Messages:** `locales/en.json`, `locales/fr.json` — navigation, page titles, buttons, labels, tooltips/aria-labels, empty/error states, toasts, legal & help content. Keys are type-checked (`i18n/next-intl.d.ts`), so a missing key fails `tsc`. `node scripts/check-locales.mjs` verifies both files have the same keys.
- **Switcher:** `components/i18n/language-switcher.tsx`, rendered in the navbar **and** the footer. It calls the `setUserLocale` server action and refreshes the router (no full reload).
- **TMDB content** (titles, overviews, genre names) follows the UI language (`en-US` / `fr-FR`).
- **Clerk** sign-in/sign-up UI switches to French (`@clerk/localizations`).
- **Legacy links:** `proxy.ts` 308-redirects `?display_lang=fr-FR` to the clean URL and sets the cookie.

## 4. New pages

| Route | Notes |
|---|---|
| `/contact` | Name, email, subject, message. Inline validation on blur and submit, character counter, toasts on success/error, success panel. Server action validates again, then sends via Brevo with `replyTo` = the visitor. Spam protection: hidden honeypot, minimum fill time, 5 messages / 10 min per IP (in-memory, per instance), HTML escaping. `?topic=premium` prefills the subject. |
| `/premium` | Prominent "Coming soon" badge, 3 plans (Free / Plus / Family) with disabled paid CTAs, **no invented prices** ("Price at launch"), "Notify me" → contact form, FAQ. Anchor `#plans`. |
| `/help` | FAQ by category (`#faq`), devices (`#devices`), contact call-to-action. |
| `/privacy`, `/terms` | Shared `LegalPage` layout with table of contents; content from the locale files. Includes a third-party embed / TMDB disclaimer and a rights-holder contact clause. **This is template text — have it reviewed by a lawyer.** |

Footer links now point to these routes (previously several pointed to non-existent slugs). The footer also carries the required TMDB attribution.

## 5. UI consistency

- One container everywhere: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8` (`components/layout/container.tsx`) — navbar, hero content, rows, grids, footer, every page.
- `PageShell` gives every page the same top offset (clears the fixed navbar) and section rhythm; `PageHeader` / `SectionHeader` give every page the same heading structure.
- Typography tokens in `lib/typography.ts` (`display`, `h1`, `h2`, `h3`, `eyebrow`, `body`, `meta`, `prose`) replace dozens of hand-written size/weight combinations.
- Listing pages share `components/layout/media-listing.tsx` (grid → empty state with a working reset link → ad → pagination).
- Series detail/watch pages share `components/media/series-details-view.tsx` and `episode-play-view.tsx`.

## 6. Auth redirect bug

**Cause:** the download button pushed `/sign-in?fallback_redirect_url=<pathname>`. This dropped the query string (`?s=2&e=5`), used a non-native parameter that Clerk lost when switching to sign-up or going through OAuth, and the sign-up page ignored it entirely. Favorites/likes used `alert()`.

**Fix:**
1. `hooks/use-auth-gate.ts` — `requireAuth()` captures `pathname + search + hash`, stores it in sessionStorage (15-minute expiry), and opens Clerk's modal with `forceRedirectUrl` **and** `signUpForceRedirectUrl`.
2. Used by the download button, favorites and like/dislike (`direct-lumina-linker.tsx`, `stream-action-suite.tsx`).
3. `/sign-in` and `/sign-up` read `redirect_url` (and the legacy parameter), accept only same-origin paths (open-redirect protection), and pass the destination to Clerk for both flows, keeping it when the user switches between them.
4. `components/auth/post-auth-redirect.tsx` — safety net: if a freshly signed-in user still lands on `/` or an auth page, they are sent to the stored location.
5. `proxy.ts` — protected-route redirects use your own `/sign-in` and `/sign-up`.

## 7. Other bugs fixed

- TV Shows page used movie genres/sorts (filters did nothing) and opened `/movies/<tvId>` — the wrong title. Same routing bug in the "Top TV" row and in multi-search results.
- "Older" year filter was sent raw to TMDB; `All` vs `all` mismatch sent `year=All`; `&&sort_by` typo in the TV query; search genre filter ignored.
- Clerk webhook wrote `createdAt: undefined` on `user.updated` (Firestore rejects it) and verified the signature against re-serialized JSON instead of the raw body.
- Cron route accepted `Bearer undefined` when `CRON_SECRET` was unset; comparison now constant-time. The daily sync was an exported server action (callable from the browser) — now server-only, with HTML escaping.
- Favorites: duplicate entries for movies saved with a season; date hydration mismatch.
- Dead "Reset filters" buttons and library shortcut tiles now work.
- Episode card play link was only reachable on hover (not on touch).
- `maximumScale: 1` removed from the viewport (blocked pinch-zoom).
- Trailer page appended `fallback=undefined` to links; trailer language now defaults to the UI language.

## 8. Things you should do

1. Add the social profile URLs in `lib/navigation.ts` (`SOCIAL_LINKS`) — icons without a URL are hidden instead of linking to `#`.
2. Have the privacy/terms text reviewed, and bump `LAST_UPDATED` in `components/support/legal-page.tsx` when it changes.
3. If you run several server instances, replace the in-memory contact rate limit with Redis/Upstash.
4. Confirm `CONTACT_FROM_EMAIL` is a verified Brevo sender, then send one test message from `/contact`.

## 9. Commit message

```
feat: add i18n, support/contact/premium pages, UI standardization, perf and auth-redirect fixes

- i18n: next-intl (en/fr) with cookie persistence, navbar + footer switcher,
  localized TMDB data and Clerk UI; legacy ?display_lang= redirected
- perf: parallel + cached TMDB fetches, memoized cards/rows, sized next/image,
  paginated grids with content-visibility, listener cleanup, unified StreamPlayer
- feat: /contact (Brevo email, validation, honeypot, rate limit, toasts),
  /premium (coming soon), /help, /privacy, /terms
- ui: shared container, typography scale and page shell across all routes
- fix(auth): return to exact watch URL (path+query) after sign-in/sign-up
- fix: TV routing/filters, "Older" year filter, webhook createdAt, cron auth,
  duplicate favorites, dead reset/shortcut controls
```
