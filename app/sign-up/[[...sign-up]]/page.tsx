import type { Metadata } from "next";
import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AuthShell,
  resolveReturnTo,
  type AuthSearchParams,
} from "@/components/auth/auth-page";
import { AuthCardSkeleton } from "@/components/skeletons/support-skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("signUp"), robots: { index: false } };
}

/** AUTH FIX: sign-up used to ignore the return URL entirely. */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: AuthSearchParams;
}) {
  const [returnTo, locale] = await Promise.all([
    resolveReturnTo(searchParams),
    getLocale(),
  ]);
  const signInUrl =
    returnTo === "/"
      ? "/sign-in"
      : `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;

  return (
    <AuthShell>
      {/* Clerk renders nothing until its script loads: show the card shape meanwhile. */}
      <ClerkLoading>
        <AuthCardSkeleton />
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp
          // Saved on the new user: the welcome email is sent in this language.
          unsafeMetadata={{ locale }}
          forceRedirectUrl={returnTo}
          signInForceRedirectUrl={returnTo}
          signInUrl={signInUrl}
        />
      </ClerkLoaded>
    </AuthShell>
  );
}
