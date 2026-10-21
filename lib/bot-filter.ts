/**
 * Bot filter for visitors outside Madagascar (see BOT_FILTER.md).
 *
 * proxy.ts sends visitors from other countries to /bot-filter until they pass
 * Google reCAPTCHA; the server then gives them a signed cookie valid 7 days.
 * Runs in the proxy (middleware) too, so only Web APIs here (Web Crypto).
 */
export const HUMAN_COOKIE = "lf_human";
export const HUMAN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const BOT_FILTER_PATH = "/bot-filter";

/** Countries that never see the check (ISO codes, comma-separated env; default Madagascar). */
const ALLOWED_COUNTRIES = (process.env.BOT_FILTER_ALLOWED_COUNTRIES || "MG")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

/**
 * BOT_FILTER_MODE: "auto" (default — on when the reCAPTCHA keys are set and the
 * country is known, i.e. on Vercel) · "off" · "force" (also without a country
 * header — to test locally / on ngrok, where every visitor counts as "abroad").
 */
const MODE =
  process.env.BOT_FILTER_MODE === "off" || process.env.BOT_FILTER_MODE === "force"
    ? process.env.BOT_FILTER_MODE
    : "auto";

const signingSecret = () => process.env.BOT_FILTER_SECRET || process.env.RECAPTCHA_SECRET_KEY || "";

const botFilterConfigured = () =>
  MODE !== "off" &&
  !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY &&
  !!process.env.RECAPTCHA_SECRET_KEY &&
  !!signingSecret();

/** Never redirected: server-to-server calls, app files, SEO files, the check itself. */
const SKIPPED_PATHS =
  /^\/(api|_next|bot-filter|robots\.txt|sitemap.*\.xml|manifest\.webmanifest|firebase-messaging-sw\.js|icon|apple-icon|opengraph-image|twitter-image|favicon\.ico|icons\/)/;

/**
 * Link-preview robots (shared links keep their title + poster) and search
 * engines. They don't run the page's scripts, so they're never counted as visitors.
 */
const ALLOWED_BOTS =
  /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|pinterest|skypeuripreview|googlebot|google-inspectiontool|bingbot|applebot|duckduckbot|yandexbot/i;

/** Should this request be checked (unless it carries a valid cookie)? */
export function needsHumanCheck({
  method,
  pathname,
  country,
  userAgent,
}: {
  method: string;
  pathname: string;
  country: string | null;
  userAgent: string | null;
}) {
  if (!botFilterConfigured()) return false;
  if (method !== "GET" && method !== "HEAD") return false;
  if (SKIPPED_PATHS.test(pathname)) return false;
  if (userAgent && ALLOWED_BOTS.test(userAgent)) return false;
  if (!country) return MODE === "force";
  return !ALLOWED_COUNTRIES.includes(country.toUpperCase());
}

/** Only same-site paths, never back to the check itself. */
export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith(BOT_FILTER_PATH)) return "/";
  return value.slice(0, 2000);
}

// ---------------------------------------------------------------- cookie --

const encoder = new TextEncoder();

async function hmac(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** "<expires ms>.<signature>" — can't be forged without the server secret. */
export async function createHumanToken(now = Date.now()) {
  const expires = now + HUMAN_TTL_SECONDS * 1000;
  return `${expires}.${await hmac(`human.v1.${expires}`)}`;
}

export async function verifyHumanToken(token: string | undefined, now = Date.now()) {
  if (!token || !signingSecret()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  const expected = await hmac(`human.v1.${expires}`);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
