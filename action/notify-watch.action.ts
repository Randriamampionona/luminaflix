"use server";

import { addWatcher, removeWatcher } from "@/lib/notify-watch-server";

const ok = (id: string, token: string) => /^\d{1,9}$/.test(id) && typeof token === "string" && token.length > 20 && token.length < 600;

/** "Notify me": push when this movie becomes available in VF or VOSTFR. */
export async function watchTitle(input: { id: string; title: string; posterPath: string | null; token: string; locale: string }) {
  if (!ok(input.id, input.token)) return false;
  try {
    await addWatcher({
      ...input,
      posterPath: input.posterPath && /^\/[\w.-]+$/.test(input.posterPath) ? input.posterPath : null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function unwatchTitle(id: string, token: string) {
  if (!ok(id, token)) return false;
  await removeWatcher(id, token);
  return true;
}
