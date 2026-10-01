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

/** "Andino Randria" → "Andino R." — enough to welcome someone without publishing their full name. */
function publicName(first: string, last: string, full: string) {
  const firstName = first.trim() || full.trim().split(/\s+/)[0] || "";
  const lastInitial = (last.trim() || full.trim().split(/\s+/).slice(1).join(" "))[0];
  if (!firstName) return "";
  return lastInitial ? `${firstName} ${lastInitial.toUpperCase()}.` : firstName;
}

async function fetchNewestUsers(): Promise<NewestUser[]> {
  try {
    const snapshot = await getDb()
      .collection("USERS")
      .orderBy("createdAt", "desc")
      .limit(NEWEST_USERS_LIMIT)
      .select("firstName", "lastName", "fullName", "profileImage", "hideFromWelcome")
      .get();

    return snapshot.docs
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
  } catch (error) {
    logFirebaseError("newest-users", error);
    return [];
  }
}

/**
 * The 11 most recently registered users (USERS ordered by `createdAt` desc).
 * Cached for an hour: the home page is high-traffic and this list changes
 * slowly, so Firestore is read at most ~24 times a day for it.
 */
export const getNewestUsers = unstable_cache(fetchNewestUsers, ["newest-users"], {
  revalidate: 3600,
  tags: ["newest-users"],
});