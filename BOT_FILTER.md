# Bot filter (visitors outside Madagascar)

`proxy.ts` sends every visitor whose country isn't Madagascar (Vercel's `x-vercel-ip-country`) to
`/bot-filter?next=<page>` until they pass Google reCAPTCHA ("I'm not a robot"). The server checks the answer
with Google and sets a signed cookie `lf_human` (7 days); the visitor lands on the page they asked for.

Not affected: Madagascar, `/api/*` (crons, webhooks, tracking…), app files, `robots.txt`, link-preview robots
(Facebook, WhatsApp, Telegram, X…) and search engines (Google, Bing…). `/bot-filter` is never tracked and no
popup appears on it. Bots never pass it, so they never count as visitors.

## Environment
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...   # reCAPTCHA "site key" (public)
RECAPTCHA_SECRET_KEY=...             # reCAPTCHA "secret key" (server only)
BOT_FILTER_SECRET=...                # optional: long random string to sign the cookie (default: the secret key)
BOT_FILTER_ALLOWED_COUNTRIES=MG      # optional: countries never checked, comma-separated ISO codes
BOT_FILTER_MODE=auto                 # optional: auto (default) | off | force (test locally: everyone is "abroad")
```
The filter is off until both reCAPTCHA keys are set. `NEXT_PUBLIC_…` is built into the app: redeploy after changing it.

## Get the reCAPTCHA keys
1. Open https://www.google.com/recaptcha/admin/create (sign in with your Google account).
2. **Label**: `LuminaFlix`.
3. **reCAPTCHA type**: **Challenge (v2)** → **"I'm not a robot" Checkbox**.
4. **Domains**: `lumina-flix.vercel.app` (and `localhost` to test on your PC).
5. Accept the terms → **Submit**.
6. Copy **Site key** → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, **Secret key** → `RECAPTCHA_SECRET_KEY`
   (`.env.local` and Vercel → Settings → Environment Variables), then redeploy.
