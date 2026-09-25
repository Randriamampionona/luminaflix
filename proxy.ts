import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, localeFromLegacyParam } from "@/i18n/config";

const isProtectedRoute = createRouteMatcher(["/wishlist(.*)", "/favorites(.*)", "/admin(.*)"]);

const LEGACY_LOCALE_PARAM = "display_lang";

export default clerkMiddleware(
  async (auth, req) => {
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
  ],
};
