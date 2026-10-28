import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, localeFromLegacyParam } from "@/i18n/config";
import { BOT_FILTER_PATH, HUMAN_COOKIE, needsHumanCheck, verifyHumanToken } from "@/lib/bot-filter";

// Signed-in only. /analytics and /media-infos additionally check the admin account on the page itself.
const isProtectedRoute = createRouteMatcher(["/wishlist(.*)", "/favorites(.*)", "/admin(.*)", "/analytics(.*)", "/media-infos(.*)"]);

const LEGACY_LOCALE_PARAM = "display_lang";

export default clerkMiddleware(
  async (auth, req) => {
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

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk production on *.vercel.app: the SDK proxies Clerk's Frontend API
    // through /__clerk on this site (incl. clerk.browser.js, which the
    // static-file rule above would otherwise skip).
    "/__clerk/(.*)",
  ],
};
