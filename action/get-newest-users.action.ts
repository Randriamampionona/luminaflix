import "server-only";
import { unstable_cache } from "next/cache";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";

export interface NewestUser {
  id: string;
  /** Public display name: first name + last-name initial (e.g. "Andino R."). */
  name: string;
  imageUrl: string | null;
  initials: string;
}

const NEWEST_USERS_LIMIT = 11;
/** The banner stays up this many days after the latest sign-up. */
const WELCOME_DAYS = 7;
/** "Until the 23rd" means until the end of that day in this zone. */
const WELCOME_TIME_ZONE = process.env.NEWEST_USERS_TIME_ZONE || "Europe/Paris";
/** Cache tag, revalidated by the Clerk webhook on every sign-up (app/api/webhooks/clerk/route.ts). */
export const NEWEST_USERS_TAG = "newest-users";

interface NewestUsersResult {
  users: NewestUser[];
  /** createdAt of the most recent USERS document (ms), null if unknown. */
  latestCreatedAt: number | null;
}

/** Firestore Timestamp, Date, ISO string or ms → ms. */
function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.isNaN(Date.parse(value)) ? null : Date.parse(value);
  if (value instanceof Date) return value.getTime();
  const ts = value as { toMillis?: () => number };
  return typeof ts.toMillis === "function" ? ts.toMillis() : null;
}

/** "Andino Randria" → "Andino R." — enough to welcome someone without publishing their full name. */
function publicName(first: string, last: string, full: string) {
  const firstName = first.trim() || full.trim().split(/\s+/)[0] || "";
  const lastInitial = (last.trim() || full.trim().split(/\s+/).slice(1).join(" "))[0];
  if (!firstName) return "";
  return lastInitial ? `${firstName} ${lastInitial.toUpperCase()}.` : firstName;
}

async function fetchNewestUsers(): Promise<NewestUsersResult> {
  try {
    const snapshot = await getDb()
      .collection("USERS")
      .orderBy("createdAt", "desc")
      .limit(NEWEST_USERS_LIMIT)
      .select("firstName", "lastName", "fullName", "profileImage", "hideFromWelcome", "createdAt")
      .get();

    const users = snapshot.docs
      .map((doc) => {
        const data = doc.data() as {
          firstName?: string;
          lastName?: string;
          fullName?: string;
          profileImage?: string;
          hideFromWelcome?: boolean;
        };
        if (data.hideFromWelcome) return null; // per-user opt-out
        const name = publicName(data.firstName ?? "", data.lastName ?? "", data.fullName ?? "");
        if (!name) return null;
        return {
          id: doc.id,
          name,
          imageUrl: data.profileImage || null,
          initials: name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join(""),
        };
      })
      .filter((user): user is NewestUser => user !== null);
    return { users, latestCreatedAt: toMillis(snapshot.docs[0]?.get("createdAt")) };
  } catch (error) {
    logFirebaseError("newest-users", error);
    return { users: [], latestCreatedAt: null };
  }
}

/**
 * The 11 most recently registered users (USERS ordered by `createdAt` desc)
 * and the date of the latest sign-up. Cached (Firestore isn't read on every
 * home page view) and refreshed the moment someone signs up: the Clerk
 * webhook that writes the new USERS document revalidates this cache tag.
 */
const getNewestUsers = unstable_cache(fetchNewestUsers, ["newest-users-v2"], {
  revalidate: 3600,
  tags: [NEWEST_USERS_TAG],
});

/** End (23:59:59.999) of the local day `ms` falls on, `days` days later. */
function endOfLocalDayPlus(ms: number, days: number, timeZone = WELCOME_TIME_ZONE) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(ms),
  );
  const [y, m, d] = day.split("-").map(Number);
  // Midnight starting the day after the target day, in `timeZone`.
  const guess = Date.UTC(y, m - 1, d + days + 1);
  const offset = (at: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(new Date(at))
        .map((p) => [p.type, p.value]),
    );
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - at;
  };
  return guess - offset(guess - offset(guess)) - 1;
}

/**
 * Banner data, or null when it shouldn't be shown: the banner stays up until
 * the end of the 7th day after the latest sign-up (sign-up on Oct 16 → shown
 * until Oct 23, 23:59). Every new sign-up pushes that date further.
 */
export async function getWelcomeBanner(now = Date.now()) {
  const { users, latestCreatedAt } = await getNewestUsers();
  if (!latestCreatedAt || users.length === 0) return null;
  const until = endOfLocalDayPlus(latestCreatedAt, WELCOME_DAYS);
  return now <= until ? { users, until } : null;
}
