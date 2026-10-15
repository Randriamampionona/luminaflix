# Analytics (admin only) — `/analytics`

## Access
- `proxy.ts` requires a signed-in user for `/analytics`.
- `app/analytics/page.tsx` then checks, on the server, that the Clerk user id **and** the verified primary
  email match the admin (`lib/analytics/admin.ts`). Anyone else gets a 403 page; no data is read.
- Override the admin with `ANALYTICS_ADMIN_USER_ID` / `ANALYTICS_ADMIN_EMAIL` if needed.

## Environment
```
ANALYTICS_SALT=<long random string>     # required in production: salt for IP hashes (e.g. `openssl rand -hex 32`)
ANALYTICS_TIME_ZONE=Europe/Paris        # optional: day boundaries in the dashboard
ANALYTICS_GEO_LOOKUP=off                # optional: disable the ipapi.co fallback (Vercel headers are always used)
```

## Firestore schema

### `ANALYTICS/{sessionId}` — one document per browsing session
```json
{
  "sessionId": "5f535a37-e7dc-40e2-a8ae-87046db47cd0",
  "visitorType": "authenticated",
  "userId": "user_39ZculUeSa9zjIYfolHjmZMm7D1",
  "ipAddress": "196.192.42.0",
  "ipHash": "3f1c9a0b7d2e4f5a6b7c8d9e",
  "country": "MG",
  "city": "Antananarivo",
  "device": "mobile",
  "browser": "Chrome",
  "referrer": "www.google.com",
  "sessionDuration": 386,
  "visitedPages": ["/", "/movies", "/movies/693134"],
  "pageViews": 5,
  "visitFrequency": 12,
  "day": "2026-10-12",
  "startedAt": "Timestamp",
  "lastActive": "Timestamp"
}
```
| Field | Meaning |
|---|---|
| `visitorType` | `"anonymous"` or `"authenticated"` (upgraded if the user signs in during the session) |
| `userId` | Clerk user id, or `null` |
| `ipAddress` | **masked** IP (last IPv4 block / IPv6 suffix removed) — the full IP is never stored |
| `ipHash` | salted HMAC-SHA256 of the IP (24 hex chars), used to recognise returning anonymous visitors |
| `country` / `city` | from Vercel/Cloudflare geo headers, else ipapi.co; `"XX"` when unknown |
| `sessionDuration` | seconds the tab was actually **visible** (max 4 h) |
| `visitedPages` | distinct routes in first-visit order (max 50); `pageViews` counts every view |
| `visitFrequency` | total sessions of this user (signed in) or IP (anonymous), this one included |
| `lastActive` | last event (page view / 60 s heartbeat / tab hidden) |

### `ANALYTICS_VISITORS/{u_<userId> | ip_<ipHash>}` — lifetime counter
```json
{ "visitCount": 12, "visitorType": "anonymous", "userId": null, "firstSeen": "Timestamp", "lastSeen": "Timestamp" }
```

## How tracking works
`components/analytics/analytics-tracker.tsx` (mounted in `app/layout.tsx`) posts to `/api/analytics/track`:
`start` (first page of a session) → `page` (each route change) → `ping` (every 60 s while visible) → `end`
(sendBeacon when the tab is hidden/closed). A new session starts after 30 min of inactivity.
Bots, `/analytics`, `/api`, `/sign-in`, `/sign-up` and browsers with Do Not Track / Global Privacy Control are not tracked.

## Privacy
Collecting (masked) IPs and location is personal data under GDPR: mention it in the privacy policy
(`legal.privacy` in `locales/*.json`) — what is collected, why (audience statistics), and for how long.

## Admin
- The admin's own visits are never counted: signed in (Clerk id) or on any browser where the admin has been
  signed in once (cookie `lf_no_track`). Older admin sessions are also hidden from every view.
- `/analytics` and `/media-infos` are never tracked, and appear in the menu only for the admin account.
- `/media-infos`: look up any movie / anime / K-drama by TMDB id, IMDb id or link, and copy a share link.
