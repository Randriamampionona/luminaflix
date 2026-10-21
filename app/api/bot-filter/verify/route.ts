import { NextResponse } from "next/server";
import { HUMAN_COOKIE, HUMAN_TTL_SECONDS, createHumanToken, safeNext } from "@/lib/bot-filter";

/**
 * POST /api/bot-filter/verify { token, next } → checks the reCAPTCHA answer
 * with Google and, if it's a person, sets the signed lf_human cookie (7 days).
 */
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// Basic abuse protection: 20 attempts per IP per 10 minutes (per server instance).
const attempts = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 10_000) attempts.clear();
  return recent.length > 20;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ ok: false, error: "rate-limited" }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { token?: unknown; next?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || token.length > 4000 || !process.env.RECAPTCHA_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  let result: { success?: boolean; hostname?: string; "error-codes"?: string[] };
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    result = await res.json();
  } catch {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  if (!result.success) {
    return NextResponse.json({ ok: false, error: result["error-codes"]?.[0] ?? "failed" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, next: safeNext(typeof body?.next === "string" ? body.next : "/") });
  response.cookies.set(HUMAN_COOKIE, await createHumanToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HUMAN_TTL_SECONDS,
  });
  return response;
}
