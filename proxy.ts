import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, localeFromLegacyParam } from "@/i18n/config";
import { BOT_FILTER_PATH, HUMAN_COOKIE, needsHumanCheck, verifyHumanToken } from "@/lib/bot-filter";
import { SHORT_CODE_RE } from "@/lib/short-links";

// Signed-in only. /analytics and /media-infos additionally check the admin account on the page itself.
const isProtectedRoute = createRouteMatcher(["/wishlist(.*)", "/favorites(.*)", "/admin(.*)", "/analytics(.*)", "/media-infos(.*)"]);

const LEGACY_LOCALE_PARAM = "display_lang";

const clerkHandler = clerkMiddleware(
  async (auth, req) => {
    // Short links (https://…/Ab3xK9q): handled by app/api/s/[code] (redirect + click stats).
    // A code always has a digit, so it never matches a page like /privacy.
    const short = req.nextUrl.pathname.slice(1);
    if (req.method === "GET" && SHORT_CODE_RE.test(short)) {
      return NextResponse.rewrite(new URL(`/api/s/${short}${req.nextUrl.search}`, req.url));
    }

    // Bot filter: visitors outside Madagascar pass a Google reCAPTCHA once
    // (/bot-filter), then a signed cookie lets them through for 7 days.
    if (
      needsHumanCheck({
        method: req.method,
        pathname: req.nextUrl.pathname,
        country: req.headers.get("x-vercel-ip-country"),
        userAgent: req.headers.get("user-agent"),
      }) &&
      !(await verifyHumanToken(req.cookies.get(HUMAN_COOKIE)?.value))
    ) {
      const url = req.nextUrl.clone();
      url.pathname = BOT_FILTER_PATH;
      url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url, 307);
    }

    // i18n: old links carried `?display_lang=fr-FR` on every URL. Strip it,
    // persist the choice in the locale cookie and redirect to the clean URL.
    const legacy = req.nextUrl.searchParams.get(LEGACY_LOCALE_PARAM);
    if (legacy !== null && req.method === "GET") {
      const url = req.nextUrl.clone();
      url.searchParams.delete(LEGACY_LOCALE_PARAM);
      const response = NextResponse.redirect(url, 308);
      const locale = localeFromLegacyParam(legacy);
      if (locale) {
        response.cookies.set(LOCALE_COOKIE, locale, {
          path: "/",
          maxAge: LOCALE_COOKIE_MAX_AGE,
          sameSite: "lax",
        });
      }
      return response;
    }

    if (isProtectedRoute(req)) await auth.protect();
  },
  {
    // AUTH FIX: protected-route redirects go to our own pages, which forward
    // `redirect_url` to Clerk so users come back to where they were.
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  },
);

/**
 * Clerk production on *.vercel.app: there is no clerk.<domain> DNS record
 * possible, so Clerk's Frontend API is proxied through this site at /__clerk
 * (https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi).
 *
 * Active only when NEXT_PUBLIC_CLERK_PROXY_URL is set (Vercel → Production:
 * https://lumina-flix.vercel.app/__clerk). Never set it with development keys
 * (localhost, previews): proxying doesn't work for development instances.
 */
const CLERK_PROXY_URL = process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.replace(/\/+$/, "");
const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (CLERK_PROXY_URL && req.nextUrl.pathname.startsWith("/__clerk")) {
    const headers = new Headers(req.headers);
    headers.set("Clerk-Proxy-Url", CLERK_PROXY_URL);
    headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY ?? "");
    headers.set("X-Forwarded-For", req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "");
    const target = new URL(req.nextUrl.pathname.replace(/^\/__clerk/, "") + req.nextUrl.search, CLERK_FRONTEND_API);
    return NextResponse.rewrite(target, { request: { headers } });
  }
  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk Frontend API proxy (incl. clerk.browser.js, which the static-file
    // rule above would otherwise skip).
    "/__clerk/(.*)",
  ],
};
