import "server-only";
import admin from "firebase-admin";
import { unstable_cache } from "next/cache";
import { isAdminUserId } from "@/lib/analytics/admin";
import { EMPTY_STATS, earnedBadges, pointsFor, type UserStats } from "@/lib/badges";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";

/**
 * USER_STATS/{userId}: streak (consecutive active days), counts of titles
 * watched per section, points, plus a public display name ("Andino R.") and
 * avatar for the /user-rank leaderboard. Costs ≤ 1 read + 1 write per day per
 * user (visit) and per title watched.
 */
const COL = "USER_STATS";
const TIME_ZONE = process.env.ANALYTICS_TIME_ZONE || "Europe/Paris";
type WatchKind = keyof UserStats["watched"];

const dayOf = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
const yesterday = () => dayOf(new Date(Date.now() - 24 * 3600 * 1000));

interface PublicProfile {
  name: string;
  imageUrl: string | null;
}

/** Records a visit (once a day) or a title watched. Never throws. */
export async function recordUserActivity(
  userId: string,
  activity: { type: "visit" } | { type: "watch"; kind: WatchKind },
  profile: PublicProfile,
) {
  if (isAdminUserId(userId)) return;
  try {
    const db = getDb();
    const ref = db.collection(COL).doc(userId);
    const today = dayOf();
    await db.runTransaction(async (tx) => {
      const [snap, userDoc] = await Promise.all([tx.get(ref), tx.get(db.collection("USERS").doc(userId))]);
      const d = snap.data() ?? {};
      const stats: UserStats = {
        ...EMPTY_STATS,
        streak: d.streak ?? 0,
        bestStreak: d.bestStreak ?? 0,
        activeDays: d.activeDays ?? 0,
        watched: { ...EMPTY_STATS.watched, ...(d.watched ?? {}) },
      };
      if (d.lastDay !== today) {
        stats.streak = d.lastDay === yesterday() ? stats.streak + 1 : 1;
        stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
        stats.activeDays += 1;
      } else if (activity.type === "visit") {
        return; // already counted today
      }
      if (activity.type === "watch") stats.watched[activity.kind] += 1;
      stats.points = pointsFor(stats);
      tx.set(
        ref,
        {
          ...stats,
          badges: earnedBadges(stats),
          lastDay: today,
          name: profile.name,
          imageUrl: profile.imageUrl,
          // Same opt-out as the "newest members" banner.
          hidden: userDoc.get("hideFromWelcome") === true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (error) {
    logFirebaseError("user-stats:record", error);
  }
}

interface RankedUser extends UserStats {
  rank: number;
  name: string;
  imageUrl: string | null;
  badges: string[];
}

/** Top users by points (cached 10 min). Users who hid themselves from public lists are skipped. */
export const getLeaderboard = unstable_cache(
  async (limit: number): Promise<RankedUser[]> => {
    try {
      const snap = await getDb().collection(COL).orderBy("points", "desc").limit(limit + 20).get();
      return snap.docs
        .map((doc) => doc.data())
        .filter((d) => !d.hidden && (d.points ?? 0) > 0)
        .slice(0, limit)
        .map((d, i) => ({
          rank: i + 1,
          name: d.name || "LuminaFlix fan",
          imageUrl: d.imageUrl ?? null,
          streak: d.streak ?? 0,
          bestStreak: d.bestStreak ?? 0,
          activeDays: d.activeDays ?? 0,
          watched: { ...EMPTY_STATS.watched, ...(d.watched ?? {}) },
          points: d.points ?? 0,
          badges: d.badges ?? [],
        }));
    } catch (error) {
      logFirebaseError("user-stats:leaderboard", error);
      return [];
    }
  },
  ["user-leaderboard-v1"],
  { revalidate: 600 },
);

/** One user's stats (not cached: 1 read, only for the signed-in user's own page). */
export async function getUserStats(userId: string): Promise<(UserStats & { badges: string[] }) | null> {
  try {
    const d = (await getDb().collection(COL).doc(userId).get()).data();
    if (!d) return null;
    return {
      streak: d.lastDay === dayOf() || d.lastDay === yesterday() ? (d.streak ?? 0) : 0,
      bestStreak: d.bestStreak ?? 0,
      activeDays: d.activeDays ?? 0,
      watched: { ...EMPTY_STATS.watched, ...(d.watched ?? {}) },
      points: d.points ?? 0,
      badges: d.badges ?? [],
    };
  } catch (error) {
    logFirebaseError("user-stats:get", error);
    return null;
  }
}
