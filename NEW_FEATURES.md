# New features — collections, coming soon, recommendations, preferences, badges…

| Feature | Where | Files |
|---|---|---|
| Collections & franchises | `/collections`, `/collections/[slug]` (curated) and `/collections/c-<tmdbId>` (any TMDB franchise); home row; search results | `lib/collections.ts` (edit the curated list here), `action/get-collections.action.ts`, `components/collections/*` |
| Coming soon + "Notify me" | `/coming-soon` | `action/get-coming-soon.action.ts`, `components/coming-soon/*`, `action/notify-watch.action.ts`, `lib/notify-watch-server.ts` (alerts sent by the daily push cron `/api/cron/push`) |
| Because you watched X | home (last 2 titles watched in this browser), under every player | `lib/watch-history.ts`, `action/get-recommendations.action.ts`, `components/home/because-you-watched.tsx`, `components/recommendations-row.tsx` |
| VF / VOSTFR only | menu → Preferences, chip above every listing | `lib/user-prefs.ts`, `lib/fr-status-client.ts`, `app/api/fr-availability/route.ts`, `lib/fr-availability.ts` (shared with the player) |
| Data saver | menu → Preferences (on by default when the phone saves data) | `lib/user-prefs.ts`, `components/prefs/*`, `lib/tmdb-image-loader.ts` |
| Trailer preview | hover (computer) / long press (phone) on a card | `components/hover-trailer.tsx`, `action/get-preview-trailer.action.ts` |
| Link previews | every title page (WhatsApp, Facebook, Telegram, X…) | `app/api/og/[kind]/[id]/route.tsx`, `lib/seo.ts`, font in `assets/fonts` (SIL OFL) |
| SEO | trailer + series pages indexable (French titles, JSON-LD); players `noindex` | `lib/seo.ts`, `components/seo/json-ld.tsx`, `app/sitemap.ts`, `app/robots.ts` |
| Install / account prompts at good moments | 12 min watched, 3rd visit, after a share | `lib/good-moments.ts`, `components/engagement-tracker.tsx` |
| Server health | player: remembered server first, ranking, dots, "Not working?" | `lib/server-health-*.ts`, `action/server-health.action.ts`, `app/api/player/health/route.ts` |
| Badges / streaks | `/user-rank`, home "Top fans", menu account card | `lib/badges.ts`, `lib/user-stats-server.ts`, `action/user-stats.action.ts`, `components/badges/*` |

## Firestore (created automatically)
- `USER_STATS/{userId}` — streak, titles watched, points, badges, public name (≤ 1 write/day + 1 per title).
- `NOTIFY_WATCH/movie_{id}` — browsers waiting for a title (deleted once notified or after 180 days).
- `SERVER_HEALTH/{kind}_{id}` and `SERVER_HEALTH/_global` — server reports (2 writes per report, reads cached 5 min).
- The leaderboard query uses `orderBy("points")` on one field: no composite index needed.
