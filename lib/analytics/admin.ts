import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/**
 * The analytics dashboard is reserved to one account. Both the Clerk user id
 * AND the primary email must match (override with ANALYTICS_ADMIN_USER_ID /
 * ANALYTICS_ADMIN_EMAIL).
 */
const ADMIN_USER_ID = process.env.ANALYTICS_ADMIN_USER_ID || "user_39ZculUeSa9zjIYfolHjmZMm7D1";
const ADMIN_EMAIL = (process.env.ANALYTICS_ADMIN_EMAIL || "tojorandria474@gmail.com").toLowerCase();

type AdminCheck = { status: "admin"; userId: string } | { status: "signed-out" } | { status: "forbidden" };

export async function checkAnalyticsAdmin(): Promise<AdminCheck> {
  const user = await currentUser();
  if (!user) return { status: "signed-out" };

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress?.toLowerCase() ?? "";
  const emailVerified =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.verification?.status === "verified";

  return user.id === ADMIN_USER_ID && primaryEmail === ADMIN_EMAIL && emailVerified
    ? { status: "admin", userId: user.id }
    : { status: "forbidden" };
}

/**
 * Quick check from the session only (no Clerk API call) — used to hide the
 * admin from the visitor stats and to show the admin links in the menu.
 * The admin pages themselves still run the full check above.
 */
export function isAdminUserId(userId: string | null | undefined) {
  return !!userId && userId === ADMIN_USER_ID;
}

/**
 * Cookie set on the admin's browsers: visits stay out of the stats even when
 * the admin is signed out on that device.
 */
export const ADMIN_NO_TRACK_COOKIE = "lf_no_track";
