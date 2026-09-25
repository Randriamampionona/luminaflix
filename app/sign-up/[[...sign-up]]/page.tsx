import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { AuthShell, resolveReturnTo, type AuthSearchParams } from "@/components/auth/auth-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("signUp"), robots: { index: false } };
}

/** AUTH FIX: sign-up used to ignore the return URL entirely. */
export default async function SignUpPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = await resolveReturnTo(searchParams);
  const signInUrl = returnTo === "/" ? "/sign-in" : `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;

  return (
    <AuthShell>
      <SignUp forceRedirectUrl={returnTo} signInForceRedirectUrl={returnTo} signInUrl={signInUrl} />
    </AuthShell>
  );
}
