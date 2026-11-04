"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { addWatcher, isWatching, removeWatcher, type WatchKind, type WatchTarget } from "@/lib/notify-watch-server";

const KINDS: WatchKind[] = ["movie", "tv", "kdrama", "anime"];

interface TargetInput {
  kind: string;
  id: string;
  season?: number;
  episode?: number;
}

function toTarget(input: TargetInput): WatchTarget | null {
  if (!KINDS.includes(input.kind as WatchKind) || !/^\d{1,9}$/.test(String(input.id))) return null;
  const kind = input.kind as WatchKind;
  if (kind === "movie") return { kind, id: String(input.id) };
  const season = Number(input.season ?? 1);
  const episode = Number(input.episode ?? 1);
  if (
    !Number.isInteger(season) ||
    !Number.isInteger(episode) ||
    season < 0 ||
    season > 200 ||
    episode < 1 ||
    episode > 5000
  ) {
    return null;
  }
  return { kind, id: String(input.id), season, episode };
}

const validToken = (token: string | null | undefined) =>
  typeof token === "string" && token.length > 20 && token.length < 600 ? token : null;

/** Is the signed-in user waiting for this title / episode? */
export async function getNotifyState(input: TargetInput): Promise<boolean> {
  const { userId } = await auth();
  const target = toTarget(input);
  if (!userId || !target) return false;
  return isWatching(target, userId).catch(() => false);
}

/**
 * "Notify me" (signed-in users): an e-mail — and a push notification if this
 * browser allows them — as soon as the title / episode exists in VF or VOSTFR.
 */
export async function watchTitle(
  input: TargetInput & { title: string; posterPath: string | null; token?: string | null; locale: string },
): Promise<"ok" | "signin" | "error"> {
  const { userId } = await auth();
  if (!userId) return "signin";
  const target = toTarget(input);
  if (!target) return "error";
  try {
    const user = await currentUser();
    await addWatcher(target, {
      title: String(input.title ?? "").slice(0, 200),
      posterPath: input.posterPath && /^\/[\w.-]+$/.test(input.posterPath) ? input.posterPath : null,
      userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      name: user?.firstName ?? null,
      locale: String(input.locale ?? "fr"),
      token: validToken(input.token),
    });
    return "ok";
  } catch {
    return "error";
  }
}

export async function unwatchTitle(input: TargetInput & { token?: string | null }): Promise<boolean> {
  const { userId } = await auth();
  const target = toTarget(input);
  if (!userId || !target) return false;
  await removeWatcher(target, userId, validToken(input.token));
  return true;
}
