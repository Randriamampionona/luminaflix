# Migration: lumina-flix.vercel.app → www.lumina-flix.live

Main address after the move: **https://www.lumina-flix.live** (lumina-flix.live redirects to it, Vercel).
The old address keeps working forever: the app (proxy.ts) sends every request to the same page
on the new domain (308) and shows a one-time "new address" notice (components/app-moved-notice.tsx).

Do the phases **in order**. Phase 1 changes nothing for visitors; phase 2 is the switch (≈15 min,
pick a quiet hour); phase 3 checks everything.

---

## Phase 1 — Preparation (the site keeps running on vercel.app)

### 1.1 Clerk: add the domain (don't switch yet if Clerk asks)
Clerk Dashboard → **Production** → **Configure → Domains** → **Add custom domain** → `lumina-flix.live`.
Clerk shows ~5 **CNAME** records. Add each one at **Namecheap → Advanced DNS → Add New Record → CNAME Record**,
Host and Value **exactly as Clerk shows** (Host without `.lumina-flix.live`). Typically:

| Host | Value (example — copy Clerk's) |
|---|---|
| `clerk` | `frontend-api.clerk.services` |
| `accounts` | `accounts.clerk.services` |
| `clkmail` | `mail.xxxx.clerk.services` |
| `clk._domainkey` | `dkim1.xxxx.clerk.services` |
| `clk2._domainkey` | `dkim2.xxxx.clerk.services` |

Wait until Clerk shows every record **Verified** and the SSL certificates **issued** (minutes to a few hours).

### 1.2 Google OAuth (Google Cloud Console → Google Auth Platform)
- **Clients → your web client**
  - Authorized JavaScript origins: **add** `https://www.lumina-flix.live` and `https://lumina-flix.live`
  - Authorized redirect URIs: **add** `https://clerk.lumina-flix.live/v1/oauth_callback`
    (check the exact URI in Clerk → SSO connections → Google once the domain is added)
  - Keep the old URIs for now → Save
- **Branding**: Authorized domains → **add** `lumina-flix.live`; home page / privacy / terms →
  `https://www.lumina-flix.live`, `…/privacy`, `…/terms` → Save

### 1.3 Facebook (developers.facebook.com → your app)
- **Facebook Login → Settings → Valid OAuth Redirect URIs**: **add** the new Clerk URI
  (`https://clerk.lumina-flix.live/v1/oauth_callback`, as shown in Clerk) — keep the old one for now
- **App settings → Basic**: App domains **add** `lumina-flix.live` and `www.lumina-flix.live`;
  Privacy policy / Terms / Data deletion URLs → `https://www.lumina-flix.live/privacy` (and `/terms`);
  Website → Site URL `https://www.lumina-flix.live` → Save

### 1.4 reCAPTCHA (bot filter) — google.com/recaptcha/admin → your key → Settings
Domains: **add** `lumina-flix.live` (covers `www.`) → Save. Keep `lumina-flix.vercel.app` and `localhost`.

### 1.5 Firebase (push notifications, live chat)
- Google Cloud Console (same project as Firebase) → **APIs & Services → Credentials** → the **Browser key**
  used by `NEXT_PUBLIC_FIREBASE_API_KEY`: if **Website restrictions** are set, **add**
  `https://www.lumina-flix.live/*` and `https://lumina-flix.live/*`. (No restriction = nothing to do.)
- Firebase Authentication isn't used by the app → nothing else. Realtime Database rules: nothing.

### 1.6 Brevo (optional but recommended for e-mail delivery)
E-mail links already follow `NEXT_PUBLIC_DOMAIN`, so nothing is required.
For better inbox placement: Brevo → **Senders, Domains & Dedicated IPs → Domains → Add a domain** →
`lumina-flix.live` → add the TXT/CNAME records it shows at Namecheap → Authenticate.
Then you can send from e.g. `no-reply@lumina-flix.live` (update `CONTACT_FROM_EMAIL` /
`NEWSLETTER_FROM_EMAIL`). Replies go to the reply-to address, so no mailbox is needed.

---

## Phase 2 — The switch (≈15 min, quiet hour)

1. **Deploy this code** (commit + push) — safe before the switch: with `NEXT_PUBLIC_DOMAIN` still
   on vercel.app, nothing redirects.
2. **Clerk → Production → Domains**: make **`lumina-flix.live` the primary domain**, and
   **remove the proxy configuration** (`https://lumina-flix.vercel.app/__clerk`).
3. **Clerk → API keys**: copy the **Publishable key** (`pk_live_…`, it changes with the domain) and
   check the **Secret key** (normally unchanged).
4. **Vercel → Settings → Environment Variables → Production**:
   - `NEXT_PUBLIC_DOMAIN` = `https://www.lumina-flix.live` (no trailing slash)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = the new `pk_live_…`
   - `CLERK_SECRET_KEY` = only if it changed
   - **Delete** `NEXT_PUBLIC_CLERK_PROXY_URL`
5. **Vercel → Deployments → ⋯ → Redeploy**, **"Use existing Build Cache" unticked**
   (`NEXT_PUBLIC_…` values are built into the app).
6. **Clerk → Webhooks** → your endpoint → change the URL to
   `https://www.lumina-flix.live/api/webhooks/clerk` (editing keeps the signing secret; a *new* endpoint
   means updating `CLERK_WEBHOOK_SECRET_PROD` + redeploy).
7. **cron-job.org** (daily push, daily e-mail, …): change every URL to `https://www.lumina-flix.live/api/cron/…`
   (same headers/secret).
8. **Vercel → Domains**: keep `lumina-flix.vercel.app` attached to Production — **do not** turn it into a
   Vercel redirect (the app does the redirect itself, with the notice, and keeps the old installed app working).

---

## Phase 3 — Checks
- [ ] `https://lumina-flix.vercel.app/movies/<id>` → lands on `https://www.lumina-flix.live/movies/<id>` + the notice (once)
- [ ] `https://lumina-flix.live` → `https://www.lumina-flix.live`
- [ ] Sign in with e-mail, **Google**, **Facebook** on www.lumina-flix.live (no "Development mode" badge)
- [ ] Sign up a test account → `USERS` document in Firestore + welcome e-mail (webhook OK)
- [ ] `/analytics` opens with your admin account
- [ ] Allow notifications on the new site → a token appears in `NOTIFICATION`; next daily push arrives
- [ ] PWA: install from www.lumina-flix.live (menu → Get the app); opens on the launch screen
- [ ] Old installed app (if you had one): opening it lands on the new site with "Install the new app"
- [ ] Share card: copied links are `https://www.lumina-flix.live/…`; a short link opens the title
- [ ] Facebook Sharing Debugger on a title URL shows the preview image
- [ ] With a VPN abroad: the bot filter (reCAPTCHA) passes on the new domain
- [ ] `https://www.lumina-flix.live/robots.txt` and `/sitemap.xml` show the new domain
- [ ] Optional: Google Search Console → add `lumina-flix.live` (DNS TXT at Namecheap) → submit the sitemap

## Phase 4 — Clean-up (after 2–4 weeks)
- Remove the old vercel.app redirect URIs / origins in Google and Facebook.
- Keep `lumina-flix.vercel.app` attached in Vercel for good (old links and installed apps).

## What visitors notice
- One notice explaining the move (FR/EN), then never again.
- They sign in once more (sessions belong to an address); account, favourites, likes and badges are kept.
- Things stored only in the browser (watch history, preferences, recent searches) start fresh on the new address.
- Notifications: allowed again on the new address. Notifications sent to the old app still arrive and open the new site.
