"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { buildSignInHref, getCurrentLocation, rememberReturnTo } from "@/lib/auth-redirect";

/**
 * Gate for actions that need an account (download, favorites, reactions).
 *
 * BUG FIX: captures the *exact* current location (path + query + hash, e.g.
 * `/k-drama/play/42?s=2&e=5`) and hands it to Clerk as the post-auth
 * destination — for sign-in *and* sign-up — so users come back to the video
 * they were on instead of `/`.
 */
export function useAuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const router = useRouter();

  const requireAuth = useCallback((): boolean => {
    if (isSignedIn) return true;
    // Clerk not ready yet: don't send a possibly signed-in user to sign-in.
    if (!isLoaded) return false;

    const returnTo = getCurrentLocation();
    rememberReturnTo(returnTo); // safety net, see <PostAuthRedirect />

    if (clerk?.openSignIn) {
      clerk.openSignIn({
        forceRedirectUrl: returnTo,
        signUpForceRedirectUrl: returnTo,
      });
    } else {
      router.push(buildSignInHref(returnTo));
    }
    return false;
  }, [clerk, isLoaded, isSignedIn, router]);

  return { isLoaded, isSignedIn: !!isSignedIn, requireAuth };
}
