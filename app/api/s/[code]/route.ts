import { auth } from "@clerk/nextjs/server";
import { NextResponse, after } from "next/server";
import { ADMIN_NO_TRACK_COOKIE, isAdminUserId } from "@/lib/analytics/admin";
import { clientIpFromHeaders, hashIp } from "@/lib/analytics/ip";
import { isBot } from "@/lib/analytics/user-agent";
import { HUMAN_COOKIE, needsHumanCheck, verifyHumanToken } from "@/lib/bot-filter";
import { clickSource, recordShortLinkClick, resolveShortCode } from "@/lib/short-links-server";

type Params = Promise<{ code: string }>;

/**
 * Short link redirect. Visitors open https://lumina-flix.vercel.app/Ab3xK9q;
 * proxy.ts rewrites that to this route, which sends them to the movie page,
 * trailer or poster. The click is recorded after the redirect is sent —
 * only for visitors who passed the bot filter (Madagascar, or a valid
 * reCAPTCHA pass from /bot-filter); never for link-preview robots
 * (WhatsApp, Facebook…), scripts calling this route directly, or the admin.
 * Unknown codes go to the home page.
 */
export async function GET(request: Request, { params }: { params: Params }) {
  const { code } = await params;
  const target = await resolveShortCode(code);
  if (!target) return NextResponse.redirect(new URL("/", request.url), 307);

  const ua = request.headers.get("user-agent");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const userId = await auth()
    .then((session) => session.userId)
    .catch(() => null);
  const isAdmin = cookieHeader.includes(`${ADMIN_NO_TRACK_COOKIE}=`) || isAdminUserId(userId);
  const countryHeader = request.headers.get("x-vercel-ip-country");
  // Same rule as the bot filter in proxy.ts: from abroad, a valid reCAPTCHA pass is required.
  const humanCookie = new RegExp(`(?:^|;\\s*)${HUMAN_COOKIE}=([^;]+)`).exec(cookieHeader)?.[1];
  const passedGuard =
    !needsHumanCheck({ method: "GET", pathname: `/${code}`, country: countryHeader, userAgent: ua }) ||
    (await verifyHumanToken(humanCookie ? decodeURIComponent(humanCookie) : undefined));
  if (passedGuard && !isBot(ua) && !isAdmin) {
    const ipHash = hashIp(clientIpFromHeaders(request.headers));
    const country = (countryHeader || "XX").toUpperCase();
    const source = clickSource(ua ?? "", request.headers.get("referer"));
    after(() => recordShortLinkClick(code, { ipHash, country, source }));
  }

  const response = NextResponse.redirect(new URL(target, request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
