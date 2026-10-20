# Live chat (admin → visitor)

From `/analytics` → "N active now" → a visitor card → **Message**: quick replies or your own text.
The visitor sees a chat panel in the bottom-right corner and can answer; you see the replies instantly.

## How it works
- **Firebase Realtime Database** (not Firestore: no Firestore quota used). One room per analytics session:
  `live_chats/{sessionId}` → `startedAt`, `updatedAt`, `adminName`, `visitorOnline`, `leftAt`, `messages/*`.
- The room only exists once you've written. Admin messages go through `POST /api/admin/chat` (admin only);
  the visitor writes its replies directly (allowed by `database.rules.json`).
- **Ephemeral:** the room and every message are deleted when the visitor closes the chat (✕), when you press
  **End chat**, or automatically ~2 min after the visitor left the site (closed the tab, lost connection) —
  a reload or a short network drop doesn't lose the conversation. Forgotten rooms are removed after 6 h.
- Visitors who aren't tracked (Do Not Track with `NEXT_PUBLIC_ANALYTICS_RESPECT_DNT=1`, `ANALYTICS_MODE=off`)
  can't be messaged.

## Setup (once)
1. Firebase Console → **Build → Realtime Database → Create database** (locked mode, any region).
2. **Rules** tab → paste `database.rules.json` → **Publish**.
3. Copy the database URL (e.g. `https://<project>-default-rtdb.europe-west1.firebasedatabase.app`) into
   `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (`.env.local` and Vercel), then **redeploy**.
4. Optional: `CHAT_ADMIN_NAME` — the name visitors see (default "LuminaFlix").

Without `NEXT_PUBLIC_FIREBASE_DATABASE_URL` the feature stays off and nothing else changes.

## Free-plan limits (Spark)
Realtime Database: 100 simultaneous connections, 1 GB stored, 10 GB downloaded / month. A visitor's browser
connects 3 s after the page loads and stays connected while the tab is open; past 100 open tabs, extra
visitors simply can't be messaged (the site keeps working).
