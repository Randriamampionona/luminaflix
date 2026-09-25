import { headers } from "next/headers";
import { sanitizeReturnTo } from "@/lib/auth-redirect";
import { Container } from "@/components/layout/container";

export type AuthSearchParams = Promise<{
  redirect_url?: string | string[];
  /** Legacy parameter used by the old download button. */
  fallback_redirect_url?: string | string[];
}>;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

/**
 * Resolves the page the user should return to after signing in / up.
 * Only same-origin paths are accepted (no open redirects).
 */
export async function resolveReturnTo(searchParams: AuthSearchParams): Promise<string> {
  const sp = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : undefined;

  return (
    sanitizeReturnTo(first(sp.redirect_url), origin) ??
    sanitizeReturnTo(first(sp.fallback_redirect_url), origin) ??
    "/"
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black pt-28 pb-16 sm:pt-32">
      <Container className="flex justify-center">{children}</Container>
    </main>
  );
}
