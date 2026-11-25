"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import { getFileInfo } from "@/lib/community/doodstream";
import { createCommunityVideo, getCommunityVideo, newCommunityId, updateCommunityVideo } from "@/lib/community/server";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_GENRES,
  COMMUNITY_LANGUAGES,
  isCommunityId,
  isEpisodic,
  type CommunityCategory,
  type CommunityGenre,
  type CommunityVideo,
} from "@/lib/community/types";
import { logFirebaseError } from "@/lib/firebase-admin";

interface CommunitySubmission {
  category: CommunityCategory;
  title: string;
  seriesTitle?: string;
  season?: number;
  episode?: number;
  description: string;
  year?: number | null;
  genres: string[];
  language?: string | null;
  cast?: string | null;
  posterUrl?: string | null;
  /** Small poster image as a data URL (resized in the browser). */
  posterData?: string | null;
  doodFileCode: string;
}

type SubmitResult = { ok: true; id: string } | { ok: false; error: string };

const clean = (text: unknown, max: number) =>
  typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** A signed-in member submits an upload (already on DoodStream) for review. */
export async function submitCommunityVideo(input: CommunitySubmission): Promise<SubmitResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "UNAUTHORIZED" };

  const category = COMMUNITY_CATEGORIES.includes(input.category) ? input.category : null;
  const episodic = category ? isEpisodic(category) : false;
  const title = clean(input.title, 140);
  const seriesTitle = episodic ? clean(input.seriesTitle, 140) : "";
  const season = episodic ? Number(input.season) : null;
  const episode = episodic ? Number(input.episode) : null;
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 2000) : "";
  const year = input.year ? Number(input.year) : null;
  const posterUrl = clean(input.posterUrl, 600);
  const posterData = typeof input.posterData === "string" ? input.posterData : "";

  if (!category) return { ok: false, error: "CATEGORY" };
  if (episodic ? !seriesTitle : !title) return { ok: false, error: "TITLE" };
  if (episodic && (!Number.isInteger(season) || season! < 1 || season! > 99)) return { ok: false, error: "SEASON" };
  if (episodic && (!Number.isInteger(episode) || episode! < 1 || episode! > 999))
    return { ok: false, error: "EPISODE" };
  if (description.length < 10) return { ok: false, error: "DESCRIPTION" };
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1)) {
    return { ok: false, error: "YEAR" };
  }
  if (posterUrl && !/^https:\/\/\S+$/i.test(posterUrl)) return { ok: false, error: "POSTER_URL" };
  if (
    posterData &&
    (!/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(posterData) || posterData.length > 700_000)
  ) {
    return { ok: false, error: "POSTER_FILE" };
  }

  // The video must really be on our DoodStream account.
  let file;
  try {
    file = await getFileInfo(String(input.doodFileCode));
  } catch {
    return { ok: false, error: "DOOD_UNAVAILABLE" };
  }
  if (!file) return { ok: false, error: "VIDEO" };

  const user = await currentUser();
  const uploaderName = user?.username || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Membre";

  try {
    const id = await newCommunityId();
    const video: CommunityVideo = {
      id,
      category,
      title,
      seriesTitle: episodic ? seriesTitle : null,
      season,
      episode,
      description,
      year,
      genres: (input.genres ?? []).filter((g): g is CommunityGenre =>
        (COMMUNITY_GENRES as readonly string[]).includes(g),
      ),
      language: (COMMUNITY_LANGUAGES as readonly string[]).includes(String(input.language))
        ? String(input.language)
        : null,
      cast: clean(input.cast, 300) || null,
      posterUrl: posterUrl || null,
      hasPoster: !!posterData,
      doodFileCode: file.fileCode,
      doodEmbedUrl: file.embedUrl,
      doodThumbnail: file.thumbnail,
      durationSec: file.durationSec,
      status: "pending",
      adult: false,
      uploaderId: userId,
      uploaderName,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    };
    await createCommunityVideo(video, posterData || null);
    return { ok: true, id };
  } catch (error) {
    logFirebaseError("community", error);
    return { ok: false, error: "FAILED" };
  }
}

type ReviewResult = { ok: true } | { ok: false; error: string };

/** Admin: approve / decline an upload, and tag it Standard or 18+. */
export async function reviewCommunityVideo(
  id: string,
  decision: "approve" | "reject" | "pending",
  adult: boolean,
): Promise<ReviewResult> {
  const admin = await checkAnalyticsAdmin();
  if (admin.status !== "admin") return { ok: false, error: "FORBIDDEN" };
  if (!isCommunityId(id) || !["approve", "reject", "pending"].includes(decision))
    return { ok: false, error: "INVALID" };
  try {
    if (!(await getCommunityVideo(id))) return { ok: false, error: "NOT_FOUND" };
    await updateCommunityVideo(id, {
      status: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "pending",
      adult: !!adult,
      reviewedAt: new Date().toISOString(),
      reviewedBy: admin.userId,
    });
    return { ok: true };
  } catch (error) {
    logFirebaseError("community", error);
    return { ok: false, error: "FAILED" };
  }
}

/** Admin: change only the rating (Standard ⇄ 18+). */
export async function setCommunityAdult(id: string, adult: boolean): Promise<ReviewResult> {
  const admin = await checkAnalyticsAdmin();
  if (admin.status !== "admin") return { ok: false, error: "FORBIDDEN" };
  if (!isCommunityId(id)) return { ok: false, error: "INVALID" };
  try {
    await updateCommunityVideo(id, { adult: !!adult });
    return { ok: true };
  } catch (error) {
    logFirebaseError("community", error);
    return { ok: false, error: "FAILED" };
  }
}
