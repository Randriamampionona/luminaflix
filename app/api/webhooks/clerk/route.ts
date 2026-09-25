import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export async function POST(req: Request) {
  // Use the secret from your Clerk Dashboard -> Webhooks -> Endpoint -> Signing Secret
  const WEBHOOK_SECRET =
    process.env.NODE_ENV === "development"
      ? process.env.CLERK_WEBHOOK_SECRET_DEV
      : process.env.CLERK_WEBHOOK_SECRET_PROD;

  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET_(DEV|PROD) is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers for Svix verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Verify against the raw body: re-serialising parsed JSON can change the
  // bytes (key order / whitespace) and break the signature check.
  const body = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Extract ID and Type
  const { id } = evt.data;
  const eventType = evt.type;

  // --- SYNC LOGIC ---
  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const { email_addresses, image_url, first_name, last_name } = evt.data;

      // Map Clerk data to Lumina Firebase Schema
      await getDb()
        .collection("USERS")
        .doc(id!)
        .set(
          {
            clerkId: id,
            email: email_addresses[0]?.email_address,
            profileImage: image_url,
            firstName: first_name || "",
            lastName: last_name || "",
            fullName: `${first_name || ""} ${last_name || ""}`.trim(),
            lastActive: admin.firestore.FieldValue.serverTimestamp(),
            // BUG FIX: `createdAt: undefined` made Firestore reject every
            // user.updated event ("Cannot use undefined as a Firestore value").
            ...(eventType === "user.created" && {
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }),
          },
          { merge: true },
        );
    }

    if (eventType === "user.deleted") {
      await getDb().collection("USERS").doc(id!).delete();
    }
  } catch (error) {
    logFirebaseError("clerk-webhook", error);
    // 500 → Clerk retries the event later.
    return new Response("Sync failed", { status: 500 });
  }

  return new Response("Lumina Sync Handshake Successful", { status: 200 });
}
