import "server-only";
import admin from "firebase-admin";
import { unstable_cache } from "next/cache";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";

/**
 * Player servers' health from visitors' reports:
 *   SERVER_HEALTH/{kind}_{mediaId}  providers.{providerId}.{ok|bad}
 *   SERVER_HEALTH/_global           providers.{providerId}.{ok|bad}
 * "ok" = someone watched ≥ 3 min on that server; "bad" = "Not working?" report.
 * Read cached 5 min per title (2 reads per miss); a report costs 2 writes.
 */
const COL = "SERVER_HEALTH";
type HealthCounts = Record<string, { ok?: number; bad?: number }>;

export async function recordServerReport(kind: string, mediaId: string, providerId: string, ok: boolean) {
  try {
    const db = getDb();
    const field = ok ? "ok" : "bad";
    const inc = admin.firestore.FieldValue.increment(1);
    const data = { providers: { [providerId]: { [field]: inc } }, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    const batch = db.batch();
    batch.set(db.collection(COL).doc(`${kind}_${mediaId}`), data, { merge: true });
    batch.set(db.collection(COL).doc("_global"), data, { merge: true });
    await batch.commit();
  } catch (error) {
    logFirebaseError("server-health:report", error);
  }
}

export function getServerHealth(kind: string, mediaId: string): Promise<{ title: HealthCounts; global: HealthCounts }> {
  return unstable_cache(
    async () => {
      try {
        const db = getDb();
        const [title, global] = await db.getAll(db.collection(COL).doc(`${kind}_${mediaId}`), db.collection(COL).doc("_global"));
        return { title: (title.get("providers") ?? {}) as HealthCounts, global: (global.get("providers") ?? {}) as HealthCounts };
      } catch (error) {
        logFirebaseError("server-health:get", error);
        return { title: {}, global: {} };
      }
    },
    ["server-health-v1", kind, mediaId],
    { revalidate: 300 },
  )();
}
