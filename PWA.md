# LuminaFlix as a Progressive Web App

## Step 1 — Manifest
`app/manifest.ts` → served at `/manifest.webmanifest` (Next.js metadata route, linked automatically).
Name, short name, `start_url: "/?source=pwa"`, `display: standalone`, theme/background colors,
icons 192 / 512 / maskable 512 (`public/icons/`), and app shortcuts (Movies, K-Drama, Anime, Favorites).
No `next-pwa` plugin: it doesn't support Turbopack (Next 16); the service worker is hand-written instead.

## Step 2 — Meta tags (`app/layout.tsx`)
- `metadata.appleWebApp` → `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`
- `metadata.other["apple-mobile-web-app-capable"] = "yes"` (+ Next's `mobile-web-app-capable`)
- `metadata.icons.apple` → `apple-touch-icon`
- `viewport.themeColor` (light/dark)
- Inline `PWA_CAPTURE_SCRIPT` at the top of `<body>`: catches `beforeinstallprompt` before React hydrates.

## Step 3 — Service worker (`public/firebase-messaging-sw.js`)
One worker for the whole site: offline caching **and** push notifications (a scope can only have one worker).
Registered by `components/pwa/service-worker-registrar.tsx` and `lib/push-client.ts`, both through
`lib/service-worker.ts` so the URL is always identical.
- Navigations: network first (6 s timeout when a cached copy exists) → cached page → `/offline`.
- `/_next/static/*` and `/icons/*`: cache first (hashed, immutable files).
- Never cached: `/api/*`, RSC requests, other origins (players, TMDB, Clerk), `/favorites`, `/analytics`, sign-in/up.
- `yarn dev` registers it with `?dev=1`: no caching in development (push still works).
- Bump `CACHE_VERSION` to throw away all old caches.

## Step 4 — `hooks/use-pwa-install.ts`
`usePWAInstall()` → `{ canInstall, isStandalone, isInstalled, isIOS, promptInstall }`.
Reads the prompt captured by the inline script; `promptInstall()` calls `prompt()` and resolves with
the user's choice; an accepted install sets `localStorage.lf_pwa_installed = "1"`.

## Step 5 — `components/pwa/pwa-install-modal.tsx`
- Shows 10 s after arrival (`NEXT_PUBLIC_PWA_PROMPT_DELAY_MS` to change it).
- "Install app" → browser install dialog. iPhone/iPad (no install event) → "Share → Add to Home Screen" steps.
- "Maybe later" / ✕ / Esc / clicking outside / refusing in the browser dialog → hidden for 7 days
  (`localStorage.lf_pwa_dismissed_at`).
- Never shown when installed, running as the app, or on sign-in / sign-up / analytics / offline pages.
- Never at the same time as the push-notification popup (`lib/prompt-lock.ts`): whichever comes second
  waits until the first is closed, plus 30 s.

## Test it
`yarn build && yarn start`, open Chrome → DevTools → Application → Manifest / Service workers.
Lighthouse → "PWA" category. On Android Chrome the popup's "Install app" opens the native dialog.
