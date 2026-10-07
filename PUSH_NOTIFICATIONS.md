# Push notifications (Firebase Cloud Messaging)

Daily "Tonight's pick" push, separate from the daily email.

## 1. Firebase Console
1. Project settings → **Cloud Messaging** → *Web configuration* → **Web Push certificates** → **Generate key pair**.
   Copy the key into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
2. The other `NEXT_PUBLIC_FIREBASE_*` values come from Project settings → General → *Your apps* (web app).
3. `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (service account) are already used for Firestore;
   the same credentials send the pushes.

## 2. Environment
```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...     # required
PUSH_TEST_USER_IDS=user_abc,user_def   # optional: Clerk ids that receive ?test=1 pushes (and all pushes outside production)
```

## 3. cron-job.org (second job, its own time)
- URL: `https://<your-domain>/api/cron/push`
- Method: **POST**
- Header: `Authorization: Bearer <CRON_SECRET>`
- Schedule: e.g. every day at 19:00 (Europe/Paris)

Test first with `https://<your-domain>/api/cron/push?test=1` (only `PUSH_TEST_USER_IDS`).
The response is JSON: `{ success, title, devices, sent, failed, removed, testOnly }`.

## How it works
- Signed-in users see a "Turn on notifications" card 8 s after arriving. "Not now" hides it for 24 h.
  To stop notifications, users block them in their browser's site settings.
- Tokens are stored on `USERS/{clerkId}.fcmTokens` (max 10 devices), with `locale` and `pushEnabled`.
- `public/firebase-messaging-sw.js` shows the notification (image, icon, "Watch now" / "Trailer" buttons) and opens the page on click.
- Dead tokens are removed automatically after each send. The last pushed title is kept in `META/push` so the same title isn't sent twice in a row.
- iPhone / iPad: web push only works once the site is added to the Home Screen (iOS 16.4+); the app manifest makes that possible.
