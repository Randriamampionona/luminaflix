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

