import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { AuthShell, resolveReturnTo, type AuthSearchParams } from "@/components/auth/auth-page";

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
      <SignIn forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo} signUpUrl={signUpUrl} />
    </AuthShell>
  );
}
