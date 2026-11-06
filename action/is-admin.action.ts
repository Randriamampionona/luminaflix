"use server";

import { auth } from "@clerk/nextjs/server";
import { isAdminUserId } from "@/lib/analytics/admin";

/** Is the signed-in user the site admin? (No Smartlinks for the admin.) */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { userId } = await auth().catch(() => ({ userId: null }));
  return isAdminUserId(userId);
}
