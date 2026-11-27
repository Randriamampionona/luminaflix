import "server-only";
import { createHmac } from "node:crypto";

/**
 * LuminaFlix Facebook Page, read with Meta's Graph API (server only: the token
 * never reaches the browser). Answers are cached 10 minutes (new posts show up
 * on /feeds within 10 minutes).
 *
 *   GET /{page-id}?fields=name,picture,followers_count,link          the Page
 *   GET /{page-id}/posts?fields=…&limit=…&after=…                     its posts
 *   GET /{post-id}?fields=…                                           one post
 *
 * Needs a Page access token with pages_read_engagement (see FACEBOOK_FEED.md).
 */
const VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
// FACEBOOK_GRAPH_URL: only to point at a local stand-in during tests (never set in production).
const GRAPH = (process.env.FACEBOOK_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || "";
const TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const REVALIDATE = 600;

export const facebookConfigured = () => !!PAGE_ID && !!TOKEN;

export type FbMedia =
  | { kind: "image"; src: string; width: number | null; height: number | null }
  | { kind: "video"; src: string | null; poster: string | null; width: number | null; height: number | null };

export interface FbPost {
  id: string;
  message: string;
  createdAt: string;
  permalink: string;
  media: FbMedia[];
  /** Vertical short video (Reel). */
  isReel: boolean;
  reactions: number;
  comments: number;
  shares: number;
}

export interface FbPage {
  name: string;
  picture: string | null;
  followers: number | null;
  link: string;
}

const POST_FIELDS = [
  "id",
  "message",
  "created_time",
  "permalink_url",
  "full_picture",
  "status_type",
  "shares",
  "attachments{media_type,type,url,media,subattachments.limit(30){media_type,type,url,media}}",
  "reactions.summary(total_count).limit(0)",
  "comments.summary(total_count).limit(0)",
].join(",");

async function graph<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!facebookConfigured()) return null;
  const query = new URLSearchParams({ ...params, access_token: TOKEN });
  // Recommended by Meta: proves the call comes from the app's server.
  if (APP_SECRET) query.set("appsecret_proof", createHmac("sha256", APP_SECRET).update(TOKEN).digest("hex"));
  try {
    const res = await fetch(`${GRAPH}/${VERSION}${path}?${query}`, {
      next: { revalidate: REVALIDATE, tags: ["facebook"] },
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as T & { error?: { message?: string; code?: number } };
    if (!res.ok || data.error) {
      console.error(`[facebook] ${path}: ${data.error?.message ?? res.status}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`[facebook] ${path}:`, error);
    return null;
  }
}

interface RawMedia {
  image?: { src?: string; width?: number; height?: number };
  source?: string;
}
interface RawAttachment {
  media_type?: string;
  type?: string;
  url?: string;
  media?: RawMedia;
  subattachments?: { data?: RawAttachment[] };
}
interface RawPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  status_type?: string;
  shares?: { count?: number };
  attachments?: { data?: RawAttachment[] };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
}

function toMedia(a: RawAttachment): FbMedia | null {
  const image = a.media?.image;
  const isVideo = a.media_type === "video" || /video|reel/.test(a.type ?? "");
  if (isVideo) {
    return {
      kind: "video",
      src: a.media?.source ?? null,
      poster: image?.src ?? null,
      width: image?.width ?? null,
      height: image?.height ?? null,
    };
  }
  if (image?.src) return { kind: "image", src: image.src, width: image.width ?? null, height: image.height ?? null };
  return null;
}

function normalize(raw: RawPost): FbPost {
  const media: FbMedia[] = [];
  for (const attachment of raw.attachments?.data ?? []) {
    const subs = attachment.subattachments?.data;
    for (const item of subs?.length ? subs : [attachment]) {
      const m = toMedia(item);
      if (m) media.push(m);
    }
  }
  if (!media.length && raw.full_picture)
    media.push({ kind: "image", src: raw.full_picture, width: null, height: null });
  const permalink = raw.permalink_url || `https://www.facebook.com/${raw.id}`;
  const video = media.find((m) => m.kind === "video");
  return {
    id: raw.id,
    message: raw.message ?? "",
    createdAt: raw.created_time,
    permalink,
    media,
    isReel:
      !!video &&
      (/\/reel\//.test(permalink) ||
        (raw.attachments?.data ?? []).some((a) => /reel/.test(a.type ?? "") || /\/reel\//.test(a.url ?? "")) ||
        (!!video.width && !!video.height && video.height > video.width)),
    reactions: raw.reactions?.summary?.total_count ?? 0,
    comments: raw.comments?.summary?.total_count ?? 0,
    shares: raw.shares?.count ?? 0,
  };
}

export async function getFacebookPage(): Promise<FbPage | null> {
  const data = await graph<{
    name?: string;
    link?: string;
    followers_count?: number;
    picture?: { data?: { url?: string } };
  }>(`/${PAGE_ID}`, { fields: "name,link,followers_count,picture.width(160).height(160)" });
  if (!data) return null;
  return {
    name: data.name ?? "LuminaFlix",
    picture: data.picture?.data?.url ?? null,
    followers: data.followers_count ?? null,
    link: data.link ?? `https://www.facebook.com/${PAGE_ID}`,
  };
}

/** A page of posts, newest first; `next` is the cursor of the following page. */
export async function getFacebookPosts(after?: string, limit = 8) {
  const params: Record<string, string> = { fields: POST_FIELDS, limit: String(limit) };
  if (after) params.after = after;
  const data = await graph<{ data?: RawPost[]; paging?: { cursors?: { after?: string }; next?: string } }>(
    `/${PAGE_ID}/posts`,
    params,
  );
  if (!data) return null;
  return {
    posts: (data.data ?? []).map(normalize),
    next: data.paging?.next ? (data.paging.cursors?.after ?? null) : null,
  };
}

const isPostId = (id: string) => /^\d{1,30}_\d{1,30}$/.test(id);

export async function getFacebookPost(id: string) {
  if (!isPostId(id)) return null;
  const raw = await graph<RawPost>(`/${id}`, { fields: POST_FIELDS });
  // Only posts of our own Page.
  return raw && raw.id.startsWith(`${PAGE_ID}_`) ? normalize(raw) : null;
}
