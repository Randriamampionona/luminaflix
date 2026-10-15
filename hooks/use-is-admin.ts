"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/** One request per signed-in account per page load. */
const cache = new Map<string, Promise<boolean>>();

function fetchIsAdmin(userId: string) {
  let pending = cache.get(userId);
  if (!pending) {
    pending = fetch("/api/admin/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { admin: false }))
      .then((body: { admin?: boolean }) => body.admin === true)
      .catch(() => false);
    cache.set(userId, pending);
  }
  return pending;
}

/**
 * True only for the admin account (checked on the server, from the session).
 * Used to show the admin links; the admin pages run their own full check.
 */
export function useIsAdmin() {
  const { isSignedIn, userId } = useAuth();
  const [admin, setAdmin] = useState<{ userId: string; value: boolean } | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    let active = true;
    void fetchIsAdmin(userId).then((value) => {
      if (active) setAdmin({ userId, value });
    });
    return () => {
      active = false;
    };
  }, [isSignedIn, userId]);

  // Never show anything once signed out or for another account.
  return !!isSignedIn && admin?.userId === userId && admin.value;
}
