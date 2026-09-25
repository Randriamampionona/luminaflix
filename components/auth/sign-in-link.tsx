"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildSignInHref, getCurrentLocation, rememberReturnTo } from "@/lib/auth-redirect";

/**
 * Navbar "Sign in" / "Join" links. The destination is computed at click time
 * (so it always includes the current query string) and passed as
 * `redirect_url`, which Clerk carries through sign-in ↔ sign-up and OAuth.
 */
export default function SignInLink({
  route = "/sign-in",
  className,
  children,
  onNavigate,
}: {
  route?: "/sign-in" | "/sign-up";
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  return (
    <Link
      href={route}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        const returnTo = getCurrentLocation();
        rememberReturnTo(returnTo);
        onNavigate?.();
        router.push(buildSignInHref(returnTo, route));
      }}
    >
      {children}
    </Link>
  );
}
