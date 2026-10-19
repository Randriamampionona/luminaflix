# Firestore usage (Spark free plan)

Daily free quota: 50,000 reads · 20,000 writes · 20,000 deletes (reset at midnight Pacific time).
What the app costs after the "Phase 1" optimisations:

| Feature | Cost | Notes |
|---|---|---|
| Visit start (analytics) | 2 reads + 2 writes | once per visit (per tab) |
| Page view (analytics) | 1 write | no read: the browser says if the route is new |
| Presence heartbeat | 1 write / min | only while the tab is visible (was every 20 s) |
| Tab hidden / closed | 1 write | |
| `/analytics` dashboard | ~1 read per session **once**, then cached | past days 24 h, yesterday 1 h, today 2 min; auto-refresh off by default |
| Live visitors | reads = visitors online | every 60 s for the badge, every 15 s while the popup is open |
| Likes / favorites on players | ≤ 1 read per title per 10 min | shared cache, expired instantly on every like / favorite change |
| Favorites page | ≤ 1 read per user per 10 min | same cache |
| Push token | 1 query + 1 read + 1 write per browser **per week** | was on every page load |
| Newest members banner | 1 query per hour / per sign-up | unchanged (already cached) |
| Daily email / daily push crons | 1 read per user / subscriber per day | unchanged |

## Kill switch
`ANALYTICS_MODE` (server env, no rebuild needed — redeploy / restart):
- `full` (default) — everything above
- `light` — no presence heartbeats (live visitors rely on page views; ~60% fewer analytics writes)
- `off` — analytics records nothing (the rest of the app is unaffected)
