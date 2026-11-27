# Facebook feed (`/feeds`) — setup guide

The `/feeds` page shows the posts of the LuminaFlix Facebook Page (text, photos,
albums, videos and Reels, with their like / comment / share counts). It reads
them with Meta's **Graph API** on the server, every 10 minutes at most.

You need **3 values**, to put in the server's `.env`:

| Variable | What it is |
|---|---|
| `FACEBOOK_PAGE_ID` | the Page's numeric id |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | a **Page access token that never expires** |
| `FACEBOOK_APP_SECRET` | your Meta app's secret (signs every call — recommended) |

Optional: `FACEBOOK_GRAPH_VERSION` (default `v21.0`).

> Meta renames its menus from time to time: if a label below differs a little,
> look for the closest one.

---

## Step 1 — Meta developer account

1. Go to **https://developers.facebook.com** and log in with the **Facebook account
   that is admin of the LuminaFlix Page**.
2. Click **Get started** (top right) and finish the sign-up (accept the terms,
   confirm your phone number / e-mail, role: "Developer").

## Step 2 — Create the app

1. **My Apps → Create app**.
2. Name: `LuminaFlix Feed` · contact e-mail: yours → **Next**.
3. Use case: **"Manage everything on your Page"** (Pages API).
   If it isn't offered, choose **Other → Business**.
4. Business portfolio: you can skip it ("I don't want to connect a business
   portfolio yet") → **Create app** (confirm with your Facebook password).

The app can stay in **Development mode**: you only read **your own** Page, as its
admin, so no Meta review is needed.

## Step 3 — App ID and App Secret

1. In the app: **App settings → Basic**.
2. Copy **App ID** (used in step 5).
3. Click **Show** next to **App secret** → copy it: that's **`FACEBOOK_APP_SECRET`**.
4. While you're there: **Privacy policy URL** = `https://www.lumina-flix.live/privacy`
   → **Save changes**.

## Step 4 — Permissions

In **Use cases → Manage everything on your Page → Customize** (or
**App Review → Permissions and features**), make sure these are added
(Standard access is enough):

- `pages_show_list`
- `pages_read_engagement`
- `pages_read_user_content`

## Step 5 — A user token, then a long-lived one

1. Open the **Graph API Explorer**: https://developers.facebook.com/tools/explorer
2. Top right: **Meta App** = `LuminaFlix Feed`, **User or Page** = *User Token*.
3. **Permissions**: add `pages_show_list`, `pages_read_engagement`,
   `pages_read_user_content`.
4. **Generate Access Token** → a Facebook window opens → choose **the LuminaFlix
   Page** → **Continue / Save**. A token appears (valid ~1 hour).
5. Make it last 60 days: open the **Access Token Debugger**
   https://developers.facebook.com/tools/debug/accesstoken , paste the token →
   **Debug** → at the bottom **Extend Access Token** → copy the new token
   (*long-lived user token*).

   (Same thing by URL, in your browser:
   `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN`)

## Step 6 — The Page token that never expires + the Page ID

Open in your browser (replace `LONG_USER_TOKEN`):

```
https://graph.facebook.com/v21.0/me/accounts?access_token=LONG_USER_TOKEN
```

You get something like:

```json
{ "data": [ { "name": "LuminaFlix", "id": "1234567890123456", "access_token": "EAAG…" } ] }
```

- `id` → **`FACEBOOK_PAGE_ID`**
- `access_token` → **`FACEBOOK_PAGE_ACCESS_TOKEN`**

Check it in the **Access Token Debugger**: *Type: Page*, **Expires: Never**, and the
3 permissions listed. (A Page token obtained from a long-lived user token does not
expire.)

## Step 7 — Quick test

```
https://graph.facebook.com/v21.0/PAGE_ID/posts?fields=message,created_time,permalink_url&limit=3&access_token=PAGE_TOKEN
```

You should see your 3 latest posts. An error means a wrong id / token or a missing
permission (see *Problems* below).

## Step 8 — Put the values on the server

On Namecheap, in `~/luminaflix/.env`:

```
FACEBOOK_PAGE_ID=1234567890123456
FACEBOOK_PAGE_ACCESS_TOKEN=EAAG…
FACEBOOK_APP_SECRET=abc123…
```

Then restart the app (cPanel → Setup Node.js App → **Restart**, or redeploy).
They're read by the server only (no `NEXT_PUBLIC_`), so they don't need to be in
the GitHub `ENV_FILE`.

**Never share the token** (it gives read access to your Page). If it leaks: redo
steps 5–6 (a new token) and, in the app, **App settings → Basic → Reset** the app
secret.

---

## How it works in the app

- `/feeds`: the Page card (avatar, followers, **Follow the Page**), then the posts
  (8 per page, "Older posts" below). Photos are laid out like a social feed
  (1 · 2 · 1 big + 2 · 2×2 with "+N"). Videos and Reels **play muted** while on
  screen, with a sound button.
- Click a post → `/feeds/<post id>`: full text (clickable links), every photo in a
  carousel (swipe / arrows / dots), the video with its controls, the counts, and
  **View the post on Facebook**.
- Counts (likes = all reactions, comments, shares) are shown only; liking or
  commenting happens on Facebook.
- New posts appear within **10 minutes** (cache).

## Problems

Errors are written in `~/luminaflix/stderr.log`, lines starting with `[facebook]`.

| Message | Fix |
|---|---|
| `Error validating access token` / code 190 | token expired or revoked (password changed, admin role removed, app permission removed): redo steps 5–6 |
| `(#200) … pages_read_engagement` / code 10 or 200 | permission missing: step 4, then a new token (steps 5–6) |
| `appsecret_proof` error | `FACEBOOK_APP_SECRET` doesn't match the app that created the token |
| `Unsupported get request` / code 100 | wrong `FACEBOOK_PAGE_ID` |

A video showing only its image with a ▶: Facebook didn't provide the video file
for that post (e.g. a video shared from another Page) — "View on Facebook" plays it.
