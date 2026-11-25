import "server-only";
import { randomInt } from "node:crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import type { CommunityCategory, CommunityStatus, CommunityVideo } from "./types";

/**
 * Firestore storage of community uploads. Only metadata is stored — the video
 * itself lives on DoodStream (file code + embed URL).
 *
 *   COMMUNITY_VIDEOS/{com_id}   the upload (see CommunityVideo)
 *   COMMUNITY_POSTERS/{com_id}  uploaded poster, small WebP as base64 (served by /api/community/poster/[id])
 *
 * Queries use a single equality filter (no composite index needed); sorting
 * is done here.
 */
const VIDEOS = "COMMUNITY_VIDEOS";
const POSTERS = "COMMUNITY_POSTERS";
const COMMUNITY_TAG = "community";

const byNewest = (a: CommunityVideo, b: CommunityVideo) => b.createdAt.localeCompare(a.createdAt);

/** A new unique id like TMDB's, prefixed: com_1560520. */
export async function newCommunityId() {
  const db = getDb();
  for (let i = 0; i < 8; i++) {
    const id = `com_${randomInt(1_000_000, 9_999_999)}`;
    const snap = await db.collection(VIDEOS).doc(id).get();
    if (!snap.exists) return id;
  }
  throw new Error("Could not allocate a community id");
}

export async function createCommunityVideo(video: CommunityVideo, poster: string | null) {
  const db = getDb();
  const batch = db.batch();
  batch.set(db.collection(VIDEOS).doc(video.id), { ...video, searchText: searchTextOf(video) });
  if (poster) batch.set(db.collection(POSTERS).doc(video.id), { data: poster, createdAt: video.createdAt });
  await batch.commit();
  revalidateTag(COMMUNITY_TAG, { expire: 0 });
}

function searchTextOf(v: Pick<CommunityVideo, "title" | "seriesTitle" | "cast" | "description">) {
  return normalize([v.title, v.seriesTitle, v.cast].filter(Boolean).join(" "));
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function fromDoc(data: FirebaseFirestore.DocumentData): CommunityVideo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { searchText, ...video } = data;
  return video as CommunityVideo;
}

async function listByStatus(status: CommunityStatus, limit = 1000) {
  const snap = await getDb().collection(VIDEOS).where("status", "==", status).limit(limit).get();
  return snap.docs.map((d) => fromDoc(d.data())).sort(byNewest);
}

/** Approved uploads, newest first (cached 2 min, refreshed at once on every review). */
export const getApprovedCommunity = unstable_cache(
  async () => {
    try {
      return await listByStatus("approved");
    } catch (error) {
      logFirebaseError("community", error);
      return [] as CommunityVideo[];
    }
  },
  ["community-approved-v1"],
  { revalidate: 120, tags: [COMMUNITY_TAG] },
);

/** Approved uploads filtered by category and text. */
export async function findApprovedCommunity({ category, query }: { category?: CommunityCategory; query?: string }) {
  const words = normalize(query ?? "")
    .split(" ")
    .filter(Boolean);
  const all = await getApprovedCommunity();
  return all.filter((v) => {
    if (category && v.category !== category) return false;
    if (!words.length) return true;
    const text = searchTextOf(v);
    return words.every((w) => text.includes(w));
  });
}

export async function getCommunityVideo(id: string) {
  try {
    const snap = await getDb().collection(VIDEOS).doc(id).get();
    return snap.exists ? fromDoc(snap.data()!) : null;
  } catch (error) {
    logFirebaseError("community", error);
    return null;
  }
}

export async function getCommunityVideos(ids: string[]) {
  if (!ids.length) return [] as CommunityVideo[];
  const db = getDb();
  const snaps = await db.getAll(...ids.map((id) => db.collection(VIDEOS).doc(id)));
  return snaps.filter((s) => s.exists).map((s) => fromDoc(s.data()!));
}

export async function getCommunityPoster(id: string) {
  const snap = await getDb().collection(POSTERS).doc(id).get();
  const data = snap.data()?.data;
  return typeof data === "string" ? data : null;
}

/** Admin dashboard: every upload by status + counts. */
export async function getCommunityReviewData() {
  const [pending, approved, rejected] = await Promise.all([
    listByStatus("pending"),
    listByStatus("approved"),
    listByStatus("rejected", 200),
  ]);
  return {
    pending,
    approved,
    rejected,
    counts: {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      total: pending.length + approved.length + rejected.length,
    },
  };
}

export async function updateCommunityVideo(
  id: string,
  patch: Partial<Pick<CommunityVideo, "status" | "adult" | "reviewedAt">> & { reviewedBy?: string },
) {
  await getDb().collection(VIDEOS).doc(id).update(patch);
  revalidateTag(COMMUNITY_TAG, { expire: 0 });
}
