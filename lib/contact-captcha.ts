import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { ContactChallenge } from "@/lib/contact";

/**
 * Self-hosted math captcha for the contact form — no third-party service,
 * no database.
 *
 * - The question ("12 + 7 =") is drawn as an SVG made of line segments
 *   (seven-segment style) with jitter and noise: there is no text in the
 *   markup for a scraper to read.
 * - The answer is never sent to the browser. The token is
 *   `nonce.expiry.HMAC(secret, nonce.expiry.answer)`: the server recomputes
 *   the HMAC with the submitted answer, so a match proves both the answer and
 *   that the token came from us.
 * - Tokens expire after 10 minutes and are single-use (per server instance).
 *
 * This stops generic spam bots. A bot written specifically for this site
 * could still solve it — use Cloudflare Turnstile / hCaptcha if that happens.
 *
 * Env: CONTACT_CAPTCHA_SECRET (recommended). Falls back to a key derived from
 * CLERK_SECRET_KEY so it works out of the box.
 */

const TTL_MS = 10 * 60 * 1000;

function getSecret(): Buffer {
  const explicit = process.env.CONTACT_CAPTCHA_SECRET;
  if (explicit) return Buffer.from(explicit);
  const base = process.env.CLERK_SECRET_KEY || process.env.BREVO_API_KEY;
  if (base) return createHash("sha256").update(`luminaflix-contact-captcha:${base}`).digest();
  // Last resort: random per process (breaks across multiple server instances).
  return (globalThis.__contactCaptchaSecret ??= randomBytes(32));
}

declare global {
  var __contactCaptchaSecret: Buffer | undefined;
}

const sign = (payload: string) => createHmac("sha256", getSecret()).update(payload).digest("base64url");

// ---------------------------------------------------------------- drawing --

// Seven-segment glyphs in a 14×24 box.
const SEGMENTS: Record<string, [number, number, number, number]> = {
  a: [0, 0, 14, 0],
  b: [14, 0, 14, 12],
  c: [14, 12, 14, 24],
  d: [0, 24, 14, 24],
  e: [0, 12, 0, 24],
  f: [0, 0, 0, 12],
  g: [0, 12, 14, 12],
};
const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abfgcd",
};
const SYMBOLS: Record<string, [number, number, number, number][]> = {
  "+": [
    [2, 12, 12, 12],
    [7, 6, 7, 18],
  ],
  "-": [[2, 12, 12, 12]],
  "=": [
    [2, 9, 12, 9],
    [2, 15, 12, 15],
  ],
};
const COLORS = ["#22d3ee", "#e4e4e7", "#a5f3fc", "#f4f4f5", "#67e8f9"];

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const jitter = (v: number) => (v + rnd(-1.3, 1.3)).toFixed(1);

function glyphLines(char: string): [number, number, number, number][] {
  // "1" centred in its box so "18" doesn't read as "| 8".
  if (char === "1") return [[7, 0, 7, 24]];
  if (DIGITS[char]) return DIGITS[char].split("").map((s) => SEGMENTS[s]);
  return SYMBOLS[char] ?? [];
}

function renderSvg(text: string): string {
  const step = 22;
  const width = text.length * step + 26;
  const height = 56;
  const parts: string[] = [];

  // Background noise (behind the glyphs).
  for (let i = 0; i < 24; i++) {
    parts.push(
      `<circle cx="${rnd(0, width).toFixed(1)}" cy="${rnd(0, height).toFixed(1)}" r="${rnd(0.6, 1.6).toFixed(1)}" fill="#ffffff" opacity="${rnd(0.1, 0.35).toFixed(2)}"/>`,
    );
  }
  for (let i = 0; i < 4; i++) {
    parts.push(
      `<path d="M${rnd(0, width * 0.3).toFixed(1)} ${rnd(0, height).toFixed(1)} Q${rnd(0, width).toFixed(1)} ${rnd(0, height).toFixed(1)} ${rnd(width * 0.7, width).toFixed(1)} ${rnd(0, height).toFixed(1)}" stroke="#ffffff" stroke-opacity="${rnd(0.12, 0.25).toFixed(2)}" stroke-width="${rnd(1, 2).toFixed(1)}" fill="none"/>`,
    );
  }

  // Glyphs: every segment jittered, every glyph rotated/scaled/offset.
  text.split("").forEach((char, index) => {
    const x = 13 + index * step + rnd(-2, 2);
    const y = 16 + rnd(-4, 4);
    // Operators barely rotate: a tilted "+" would read as "×".
    const isSymbol = !DIGITS[char];
    const rotate = (isSymbol ? rnd(-4, 4) : rnd(-14, 14)).toFixed(1);
    const scale = rnd(0.95, 1.15).toFixed(2);
    const color = COLORS[randomInt(COLORS.length)];
    const lines = glyphLines(char)
      .map(([x1, y1, x2, y2]) => `<line x1="${jitter(x1)}" y1="${jitter(y1)}" x2="${jitter(x2)}" y2="${jitter(y2)}"/>`)
      .join("");
    parts.push(
      `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate} 7 12) scale(${scale})" stroke="${color}" stroke-width="${rnd(2.6, 3.4).toFixed(1)}" stroke-linecap="round">${lines}</g>`,
    );
  });

  // Foreground strike-through lines (make segmentation harder).
  for (let i = 0; i < 3; i++) {
    parts.push(
      `<line x1="${rnd(0, width * 0.2).toFixed(1)}" y1="${rnd(8, height - 8).toFixed(1)}" x2="${rnd(width * 0.8, width).toFixed(1)}" y2="${rnd(8, height - 8).toFixed(1)}" stroke="#22d3ee" stroke-opacity="${rnd(0.25, 0.4).toFixed(2)}" stroke-width="1.2"/>`,
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// ------------------------------------------------------------ challenge --

export function createContactChallenge(): ContactChallenge {
  const add = randomInt(2) === 0;
  const a = add ? randomInt(2, 20) : randomInt(10, 20);
  const b = randomInt(1, 10);
  const answer = add ? a + b : a - b;

  const nonce = randomBytes(12).toString("base64url");
  const expires = Date.now() + TTL_MS;
  const token = `${nonce}.${expires}.${sign(`${nonce}.${expires}.${answer}`)}`;

  return { token, image: renderSvg(`${a}${add ? "+" : "-"}${b}=`) };
}

// Single-use tokens (best-effort, per server instance).
const usedNonces = new Map<string, number>();

function markUsed(nonce: string, expires: number) {
  usedNonces.set(nonce, expires);
  if (usedNonces.size > 5000) {
    const now = Date.now();
    for (const [n, exp] of usedNonces) if (exp < now) usedNonces.delete(n);
  }
}

type CaptchaResult = "ok" | "wrong" | "expired";

export function verifyContactChallenge(token: string, answer: string): CaptchaResult {
  const [nonce, expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!nonce || !signature || !Number.isFinite(expires)) return "expired";
  if (Date.now() > expires || usedNonces.has(nonce)) return "expired";

  // Every attempt consumes the token, so a bot can't brute-force one question.
  markUsed(nonce, expires);

  const cleanAnswer = answer.trim();
  if (!/^\d{1,3}$/.test(cleanAnswer)) return "wrong";

  const expected = Buffer.from(sign(`${nonce}.${expires}.${Number(cleanAnswer)}`));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? "ok" : "wrong";
}