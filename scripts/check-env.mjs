#!/usr/bin/env node
/**
 * Diagnoses the server configuration used by favorites, likes and the
 * contact form. Reads .env.local / .env like Next.js does.
 *
 *   yarn check:env              # Firebase key + live Firestore read, Brevo key + sender
 *   yarn check:env --send-test  # …and send a test email to CONTACT_TO_EMAIL
 *
 * Secrets are never printed.
 */
import { createPrivateKey } from "node:crypto";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const ok = (msg) => console.log(`  \u2713 ${msg}`);
const bad = (msg) => {
  console.log(`  \u2717 ${msg}`);
  process.exitCode = 1;
};
const warn = (msg) => console.log(`  ! ${msg}`);
const check = (condition, okMsg, badMsg) => (condition ? ok(okMsg) : bad(badMsg));

// Keep in sync with normalizePrivateKey() in lib/firebase-admin.ts.
const PEM_RE = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/;
function stripQuotes(v) {
  v = v.trim();
  return v.length >= 2 && /^(["']).*\1$/s.test(v) ? v.slice(1, -1) : v;
}
function normalizePrivateKey(raw) {
  let key = stripQuotes(raw).replace(/\\\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r/g, "");
  if (!PEM_RE.test(key)) {
    const decoded = Buffer.from(key.replace(/\s+/g, ""), "base64").toString("utf8");
    if (PEM_RE.test(decoded)) key = decoded;
  }
  const match = key.match(PEM_RE);
  if (!match) {
    if (/^[a-f0-9]{40}$/i.test(key.trim())) throw new Error("this is the private_key_id, not the private_key");
    if (/^-----BEGIN [A-Z ]+-----$/.test(key.trim())) {
      throw new Error("only the first line was read — the value is multi-line without quotes in .env.local");
    }
    throw new Error("not a PEM key (-----BEGIN PRIVATE KEY----- … -----END PRIVATE KEY-----)");
  }
  const lines = match[2].replace(/\s+/g, "").match(/.{1,64}/g) ?? [];
  const pem = `-----BEGIN ${match[1]}-----\n${lines.join("\n")}\n-----END ${match[1]}-----\n`;
  createPrivateKey(pem);
  return pem;
}

async function checkFirebase() {
  console.log("\nFirebase Admin");
  let projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  let clientEmail = stripQuotes(process.env.FIREBASE_CLIENT_EMAIL ?? "");
  let rawKey =
    process.env.FIREBASE_PRIVATE_KEY ||
    (process.env.FIREBASE_PRIVATE_KEY_BASE64
      ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, "base64").toString("utf8")
      : "");

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const json = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      const sa = JSON.parse(json.startsWith("{") ? json : Buffer.from(json, "base64").toString("utf8"));
      ({ project_id: projectId, client_email: clientEmail, private_key: rawKey } = sa);
      ok("Using FIREBASE_SERVICE_ACCOUNT");
    } catch {
      return bad("FIREBASE_SERVICE_ACCOUNT is not valid JSON (or base64 of it)");
    }
  }

  check(projectId, `Project: ${projectId}`, "FIREBASE_PROJECT_ID is missing");
  check(clientEmail?.includes("@"), `Client email: ${clientEmail}`, "FIREBASE_CLIENT_EMAIL is missing or invalid");
  if (!rawKey) return bad("FIREBASE_PRIVATE_KEY is missing");

  let privateKey;
  try {
    privateKey = normalizePrivateKey(rawKey);
    ok("FIREBASE_PRIVATE_KEY parses as a valid private key");
  } catch (error) {
    return bad(`FIREBASE_PRIVATE_KEY is invalid: ${error.message}`);
  }
  if (!projectId || !clientEmail) return;

  try {
    const { default: admin } = await import("firebase-admin");
    const app = admin.initializeApp(
      { credential: admin.credential.cert({ projectId, clientEmail, privateKey }) },
      "check-env",
    );
    const read = app.firestore().collection("FAVORITE").doc("__healthcheck__").get();
    await Promise.race([read, new Promise((_, r) => setTimeout(() => r(new Error("timed out after 10s")), 10_000))]);
    ok("Live Firestore read succeeded");
    await app.delete();
  } catch (error) {
    bad(`Live Firestore read failed: ${error.message}`);
    if (/invalid_grant|account not found/i.test(error.message)) {
      warn(
        "The key was revoked or belongs to another service account: create a new key in Firebase console > Project settings > Service accounts.",
      );
    }
  }
}

async function brevo(path, init = {}) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    ...init,
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      accept: "application/json",
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function checkBrevo() {
  console.log("\nContact email (Brevo)");
  const to = process.env.CONTACT_TO_EMAIL || "tojorandria474@gmail.com";
  const from = process.env.CONTACT_FROM_EMAIL || "tojorandria474@gmail.com";
  ok(`Recipient: ${to}${process.env.CONTACT_TO_EMAIL ? "" : " (default)"}`);
  ok(`Sender: ${from}${process.env.CONTACT_FROM_EMAIL ? "" : " (default)"}`);
  if (!process.env.BREVO_API_KEY) return bad("BREVO_API_KEY is missing");

  try {
    const account = await brevo("/account");
    if (account.status === 401) {
      return bad(
        `Brevo rejected the API key: ${account.body.message ?? "unauthorized"}. If "Authorised IPs" is on (Brevo > Security), add this machine's / server's IP or turn it off.`,
      );
    }
    if (account.status !== 200) return bad(`Brevo /account returned ${account.status}: ${account.body.message ?? ""}`);
    ok(`API key valid (account: ${account.body.email ?? "?"})`);

    const senders = await brevo("/senders");
    const sender = senders.body.senders?.find((s) => s.email?.toLowerCase() === from.toLowerCase());
    if (!sender) bad(`${from} is not a sender in Brevo. Add and verify it under Senders, Domains & Dedicated IPs.`);
    else if (!sender.active) bad(`${from} exists in Brevo but is not verified/active yet.`);
    else ok(`${from} is a verified sender`);
    if (/@(gmail|yahoo|outlook|hotmail)\./i.test(from)) {
      warn(
        "Free-mail senders often land in spam when sent through Brevo. A sender on your own authenticated domain is more reliable.",
      );
    }

    if (process.argv.includes("--send-test")) {
      const sent = await brevo("/smtp/email", {
        method: "POST",
        body: JSON.stringify({
          sender: { email: from, name: "LuminaFlix Contact" },
          to: [{ email: to }],
          subject: "[LuminaFlix] Contact form test",
          textContent: "If you can read this, the contact form can deliver email.",
        }),
      });
      check(
        sent.status < 300,
        `Test email accepted by Brevo (messageId ${sent.body.messageId}). Check the inbox and spam folder of ${to}.`,
        `Test email rejected (${sent.status}): ${sent.body.message ?? ""}`,
      );
    }
  } catch (error) {
    bad(`Could not reach api.brevo.com: ${error.message}`);
  }
}

function checkClerk() {
  console.log("\nClerk");
  check(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    "Publishable key set",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing",
  );
  check(process.env.CLERK_SECRET_KEY, "Secret key set", "CLERK_SECRET_KEY is missing");
}

checkClerk();
await checkFirebase();
await checkBrevo();
console.log(process.exitCode ? "\nSome checks failed.\n" : "\nAll checks passed.\n");
