import type { Metadata } from "next";
import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { AuthShell, resolveReturnTo, type AuthSearchParams } from "@/components/auth/auth-page";
import { AuthCardSkeleton } from "@/components/skeletons/support-skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("signIn"), robots: { index: false } };
}

/**
 * AUTH FIX: the destination is forced for sign-in AND for the sign-up flow
 * started from here (and kept when switching to /sign-up), so OAuth and
 * account creation also return to the original watch page.
 */
export default async function SignInPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = await resolveReturnTo(searchParams);
  const signUpUrl = returnTo === "/" ? "/sign-up" : `/sign-up?redirect_url=${encodeURIComponent(returnTo)}`;

  return (
    <AuthShell>
      {/* Clerk renders nothing until its script loads: show the card shape meanwhile. */}
      <ClerkLoading>
        <AuthCardSkeleton />
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo} signUpUrl={signUpUrl} />
      </ClerkLoaded>
    </AuthShell>
  );
}
