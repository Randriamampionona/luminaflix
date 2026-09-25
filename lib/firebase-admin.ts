import "server-only";
import { createPrivateKey } from "node:crypto";
import admin from "firebase-admin";

/**
 * Firebase Admin (server only).
 *
 * BUG FIX: `Getting metadata from plugin failed … DECODER routines::unsupported`
 * is OpenSSL failing to parse FIREBASE_PRIVATE_KEY. The old code only turned
 * `\n` into newlines, so any other formatting problem (wrapping quotes,
 * Windows `\r`, a key pasted on one line with spaces, a double-escaped
 * `\\n`, or the `private_key_id` pasted instead of `private_key`) produced
 * that cryptic gRPC error on the first Firestore call — which made favorites
 * look empty and the player buttons do nothing.
 *
 * Now the key is normalized and validated *before* initialization, with an
 * explicit error message, and initialization is lazy (first use) so a bad
 * key no longer crashes every module that imports this file.
 *
 * Supported configuration (first match wins):
 * 1. FIREBASE_SERVICE_ACCOUNT — the whole service-account JSON (raw or base64)
 * 2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *    (or FIREBASE_PRIVATE_KEY_BASE64)
 */

class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(`[firebase-admin] ${message}`);
    this.name = "FirebaseConfigError";
  }
}

const PEM_RE = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/;

function stripQuotes(value: string) {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

function decodeBase64(value: string) {
  try {
    return Buffer.from(value.replace(/\s+/g, ""), "base64").toString("utf8");
  } catch {
    return "";
  }
}

/** Turns any common copy/paste variant of a PEM key into a valid PEM string. */
function normalizePrivateKey(raw: string): string {
  let key = stripQuotes(raw)
    .replace(/\\\\n/g, "\n") // double-escaped \\n
    .replace(/\\n/g, "\n") // escaped \n
    .replace(/\r/g, ""); // Windows line endings

  if (!PEM_RE.test(key)) {
    // Maybe the whole PEM was base64-encoded.
    const decoded = decodeBase64(key);
    if (PEM_RE.test(decoded)) key = decoded;
  }

  const match = key.match(PEM_RE);
  if (!match) {
    if (/^[a-f0-9]{40}$/i.test(key.trim())) {
      throw new FirebaseConfigError(
        "FIREBASE_PRIVATE_KEY looks like the `private_key_id`. Use the `private_key` value from the service-account JSON instead.",
      );
    }
    if (/^-----BEGIN [A-Z ]+-----$/.test(key.trim())) {
      throw new FirebaseConfigError(
        "FIREBASE_PRIVATE_KEY contains only its first line: in .env.local, a multi-line value must be wrapped in double quotes (or use \\n on one line).",
      );
    }
    throw new FirebaseConfigError(
      "FIREBASE_PRIVATE_KEY is not a PEM key (expected -----BEGIN PRIVATE KEY----- … -----END PRIVATE KEY-----).",
    );
  }

  // Rebuild the PEM: header, base64 body in 64-char lines, footer. This also
  // repairs keys whose newlines were turned into spaces by a dashboard.
  const [, label, body] = match;
  const lines = body.replace(/\s+/g, "").match(/.{1,64}/g) ?? [];
  const pem = `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;

  try {
    createPrivateKey(pem); // same OpenSSL parser gRPC uses — fail early, clearly
  } catch (error) {
    throw new FirebaseConfigError(
      `FIREBASE_PRIVATE_KEY could not be parsed (${(error as Error).message}). Copy the "private_key" value from the service-account JSON again.`,
    );
  }
  return pem;
}

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function readServiceAccount(): ServiceAccount {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (json) {
    const text = json.startsWith("{") ? json : decodeBase64(json);
    let parsed: { project_id?: string; client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new FirebaseConfigError("FIREBASE_SERVICE_ACCOUNT is not valid JSON (or base64 of it).");
    }
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new FirebaseConfigError("FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key.");
    }
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = stripQuotes(process.env.FIREBASE_CLIENT_EMAIL ?? "");
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || decodeBase64(process.env.FIREBASE_PRIVATE_KEY_BASE64 ?? "");

  const missing = [
    !projectId && "FIREBASE_PROJECT_ID",
    !clientEmail && "FIREBASE_CLIENT_EMAIL",
    !rawKey && "FIREBASE_PRIVATE_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new FirebaseConfigError(`Missing environment variable(s): ${missing.join(", ")}.`);
  }
  if (!clientEmail.includes("@")) {
    throw new FirebaseConfigError("FIREBASE_CLIENT_EMAIL should look like name@project.iam.gserviceaccount.com.");
  }

  return { projectId: projectId!, clientEmail, privateKey: normalizePrivateKey(rawKey) };
}

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.app();
  const { projectId, clientEmail, privateKey } = readServiceAccount();
  return admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
}

let firestore: admin.firestore.Firestore | null = null;

/**
 * Firestore (single instance). Throws FirebaseConfigError with a readable
 * message when the credentials are missing or malformed.
 */
export function getDb(): admin.firestore.Firestore {
  if (!firestore) firestore = getApp().firestore();
  return firestore;
}

/** Log once per error message instead of on every request. */
const logged = new Set<string>();
export function logFirebaseError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const key = `${scope}:${message}`;
  if (logged.has(key)) return;
  logged.add(key);
  console.error(`[${scope}]`, error instanceof FirebaseConfigError ? message : error);
}
