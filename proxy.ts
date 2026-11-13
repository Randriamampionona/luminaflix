import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, localeFromLegacyParam } from "@/i18n/config";
import { BOT_FILTER_PATH, HUMAN_COOKIE, needsHumanCheck, verifyHumanToken } from "@/lib/bot-filter";
import { publicUrl } from "@/lib/public-origin";
import { SHORT_CODE_RE } from "@/lib/short-links";

// Signed-in only. /analytics and /media-infos additionally check the admin account on the page itself.
const isProtectedRoute = createRouteMatcher(["/wishlist(.*)", "/favorites(.*)", "/admin(.*)", "/analytics(.*)", "/media-infos(.*)"]);

const LEGACY_LOCALE_PARAM = "display_lang";

const clerkHandler = clerkMiddleware(
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
      // Public origin (not req.url, which is http://0.0.0.0:3000 on the Node server).
      const url = publicUrl(BOT_FILTER_PATH, req.headers);
      url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url, 307);
    }

    // Short links (https://…/Ab3xK9q): handled by app/api/s/[code] (redirect + click stats).
    // Placed AFTER the bot filter: visitors from abroad pass the reCAPTCHA first,
    // so only real people reach the redirect and get counted.
    // A code always has a digit, so it never matches a page like /privacy.
    const short = req.nextUrl.pathname.slice(1);
    if (req.method === "GET" && SHORT_CODE_RE.test(short)) {
      return NextResponse.rewrite(new URL(`/api/s/${short}${req.nextUrl.search}`, req.url));
    }

    // i18n: old links carried `?display_lang=fr-FR` on every URL. Strip it,
    // persist the choice in the locale cookie and redirect to the clean URL.
    const legacy = req.nextUrl.searchParams.get(LEGACY_LOCALE_PARAM);
    if (legacy !== null && req.method === "GET") {
      const url = publicUrl(req.nextUrl.pathname + req.nextUrl.search, req.headers);
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
 * Optional Clerk Frontend API proxy at /__clerk (only needed when Clerk can't
 * have a clerk.<domain> DNS record, e.g. on *.vercel.app). Active only when
 * NEXT_PUBLIC_CLERK_PROXY_URL is set. Since the move to lumina-flix.live Clerk
 * uses clerk.lumina-flix.live directly: leave NEXT_PUBLIC_CLERK_PROXY_URL unset.
 * (https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi)
 */
const CLERK_PROXY_URL = process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.replace(/\/+$/, "");
const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";

/**
 * Old addresses of the site (default: lumina-flix.vercel.app). Every request
 * on them is sent to the same page on the main address (NEXT_PUBLIC_DOMAIN,
 * e.g. https://www.lumina-flix.live) with a permanent 308 redirect — shared
 * links, short links, bookmarks and the old installed app keep working.
 * Pages get `?moved=1` (`moved=pwa` from the old installed app) so the new
 * site can explain the move once (components/app-moved-notice.tsx).
 * Preview deployments and localhost are never redirected. Override with
 * LEGACY_HOSTS=host1,host2 if needed.
 */
const CANONICAL = (() => {
  try {
    return process.env.NEXT_PUBLIC_DOMAIN ? new URL(process.env.NEXT_PUBLIC_DOMAIN) : null;
  } catch {
    return null;
  }
})();
const LEGACY_HOSTS = (process.env.LEGACY_HOSTS ?? "lumina-flix.vercel.app")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

function legacyRedirect(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (!CANONICAL || !LEGACY_HOSTS.includes(host) || host === CANONICAL.host) return null;

  const { pathname, searchParams } = req.nextUrl;
  const fromApp = pathname === "/launch" || searchParams.get("source") === "pwa";
  let target: URL;
  if (pathname === "/launch") {
    // Old installed app: skip the splash screen, go straight to its first page.
    const to = searchParams.get("to");
    target = new URL(to && to.startsWith("/") && !to.startsWith("//") ? to : "/", CANONICAL.origin);
    target.searchParams.set("source", "pwa");
  } else {
    target = new URL(pathname + req.nextUrl.search, CANONICAL.origin);
  }
  // Only pages show the notice; API calls (webhooks, crons) are just forwarded.
  if (req.method === "GET" && !pathname.startsWith("/api/")) target.searchParams.set("moved", fromApp ? "pwa" : "1");
  return NextResponse.redirect(target, 308);
}

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const moved = legacyRedirect(req);
  if (moved) return moved;
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
