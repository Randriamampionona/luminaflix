"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { consumeReturnTo, getCurrentLocation } from "@/lib/auth-redirect";

const LANDING_ROUTES = /^\/($|sign-in|sign-up)/;

/**
 * Safety net for the auth redirect. If Clerk ever drops the destination
 * (OAuth edge cases, email-link sign-in opened in the same tab, …) and the
 * user lands on `/` or an auth route right after signing in, send them back
 * to the page stored by `useAuthGate()`. The stored value expires after 15
 * minutes and is cleared as soon as it's read.
 */
export default function PostAuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const target = consumeReturnTo();
    if (target && target !== getCurrentLocation() && LANDING_ROUTES.test(pathname)) {
      router.replace(target);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
