import { SignIn } from "@clerk/nextjs";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    fallback_redirect_url?: string;
  }>;
}) {
  const { fallback_redirect_url } = await searchParams;

  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-black">
      <SignIn fallbackRedirectUrl={fallback_redirect_url || "/"} />
    </main>
  );
}
