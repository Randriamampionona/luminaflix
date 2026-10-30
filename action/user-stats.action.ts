"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { recordUserActivity } from "@/lib/user-stats-server";

const KINDS = ["movie", "tv", "kdrama", "anime"] as const;

/** Signed-in users only: a visit (once a day) or a title watched → streak, badges, points. */
export async function recordActivity(type: "visit" | "watch", kind?: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  if (type === "watch" && !KINDS.includes(kind as (typeof KINDS)[number])) return;
  const user = await currentUser().catch(() => null);
  const first = user?.firstName?.trim() || user?.username || "LuminaFlix fan";
  const lastInitial = user?.lastName?.trim()?.[0];
  const profile = { name: lastInitial ? `${first} ${lastInitial}.` : first, imageUrl: user?.imageUrl ?? null };
  await recordUserActivity(
    userId,
    type === "watch" ? { type: "watch", kind: kind as (typeof KINDS)[number] } : { type: "visit" },
    profile,
  );
}
