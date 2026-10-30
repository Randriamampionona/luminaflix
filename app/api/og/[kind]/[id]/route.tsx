import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getKDramaDetails } from "@/action/get-kdrama-details.action";
import { getMovieData } from "@/action/get-movie-data.action";

/**
 * Link preview image (1200×630) for a title — WhatsApp, Facebook, Messenger,
 * Telegram, X… GET /api/og/{movie|tv|kdrama|anime}/{tmdbId}?lang=fr|en
 * Backdrop, poster, title, year, rating and "Watch on LuminaFlix".
 * Cached a day by the CDN.
 */
export const revalidate = 86400;

const TEXT = {
  fr: { cta: "Regarder sur LuminaFlix", movie: "Film", tv: "Série", kdrama: "K-Drama", anime: "Anime" },
  en: { cta: "Watch on LuminaFlix", movie: "Movie", tv: "Series", kdrama: "K-Drama", anime: "Anime" },
} as const;

type Params = Promise<{ kind: string; id: string }>;

const IMAGE_BASE = (process.env.OG_IMAGE_BASE || "https://image.tmdb.org/t/p").replace(/\/+$/, "");

/** Instrument Sans (SIL Open Font License, assets/fonts/InstrumentSans-OFL.txt). */
const fontsPromise = Promise.all(
  ["InstrumentSans-Regular.ttf", "InstrumentSans-Bold.ttf", "InstrumentSans-BoldItalic.ttf"].map((file) =>
    readFile(join(process.cwd(), "assets", "fonts", file)),
  ),
)
  .then(([regular, bold, boldItalic]) => [
    { name: "Instrument", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Instrument", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Instrument", data: boldItalic, weight: 700 as const, style: "italic" as const },
  ])
  .catch(() => undefined);

/** Image as a data URL (null if it can't be fetched: the card is drawn without it). */
async function loadImage(path: string | null, size: string) {
  if (!path) return null;
  try {
    const res = await fetch(`${IMAGE_BASE}/${size}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { kind, id } = await params;
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "fr";
  const k = (["movie", "tv", "kdrama", "anime"].includes(kind) ? kind : "movie") as keyof (typeof TEXT)["fr"];
  if (!/^\d{1,9}$/.test(id)) return new Response("Not found", { status: 404 });

  let title = "LuminaFlix";
  let year = "";
  let rating = 0;
  let overview = "";
  let poster: string | null = null;
  let backdrop: string | null = null;
  let genres: string[] = [];
  if (k === "movie") {
    const m = await getMovieData(id).catch(() => null);
    if (m) {
      title = m.title;
      year = m.release_date?.slice(0, 4) ?? "";
      rating = m.vote_average ?? 0;
      overview = m.overview ?? "";
      poster = m.poster_path;
      backdrop = m.backdrop_path;
      genres = m.genres?.map((g) => g.name) ?? [];
    }
  } else {
    const s = await getKDramaDetails(id).catch(() => null);
    if (s) {
      title = s.name;
      year = s.first_air_date?.slice(0, 4) ?? "";
      rating = s.vote_average ?? 0;
      overview = s.overview ?? "";
      poster = s.poster_path;
      backdrop = s.backdrop_path;
      genres = s.genres?.map((g) => g.name) ?? [];
    }
  }
  const t = TEXT[lang];
  const [posterSrc, backdropSrc, fonts] = await Promise.all([
    loadImage(poster, "w500"),
    loadImage(backdrop, "w1280"),
    fontsPromise,
  ]);
  const short = overview.length > 170 ? `${overview.slice(0, 167).trimEnd()}…` : overview;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#050507",
        position: "relative",
        fontFamily: "Instrument",
      }}
    >
      {backdropSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backdropSrc}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover", opacity: 0.45 }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage: "linear-gradient(90deg, rgba(5,5,7,0.97) 0%, rgba(5,5,7,0.85) 50%, rgba(5,5,7,0.4) 100%)",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
          padding: "56px 64px",
          width: "100%",
          position: "relative",
        }}
      >
        {posterSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt=""
            width={330}
            height={495}
            style={{
              width: 330,
              height: 495,
              borderRadius: 24,
              objectFit: "cover",
              boxShadow: "0 30px 80px rgba(6,182,212,0.35)",
              border: "2px solid rgba(255,255,255,0.12)",
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#06b6d4",
                color: "#000",
                fontSize: 30,
                fontWeight: 700,
                fontStyle: "italic",
              }}
            >
              L
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, fontStyle: "italic", color: "#fff" }}>
              LUMINA<span style={{ color: "#22d3ee" }}>FLIX</span>
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: 10,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(6,182,212,0.18)",
                color: "#67e8f9",
                fontSize: 20,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {t[k]}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: title.length > 28 ? 58 : 72,
              lineHeight: 1.05,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: -1.5,
              maxHeight: 160,
              overflow: "hidden",
            }}
          >
            {title}
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 20, fontSize: 26, color: "#d4d4d8" }}
          >
            {rating > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: "rgba(250,204,21,0.15)",
                  color: "#facc15",
                  fontWeight: 700,
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#facc15">
                  <path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18.3 5.5 22l1.7-7.4-5.7-5 7.5-.7z" />
                </svg>
                {rating.toFixed(1)}/10
              </div>
            )}
            {year && <div style={{ display: "flex", fontWeight: 700 }}>{year}</div>}
            {genres.length > 0 && (
              <div style={{ display: "flex", color: "#a1a1aa" }}>{genres.slice(0, 2).join(" · ")}</div>
            )}
          </div>

          {short && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 24,
                lineHeight: 1.4,
                color: "#a1a1aa",
                maxHeight: 100,
                overflow: "hidden",
              }}
            >
              {short}
            </div>
          )}

          <div style={{ display: "flex", marginTop: 34 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 30px",
                borderRadius: 18,
                background: "#06b6d4",
                color: "#000",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#000">
                <path d="M6 4l14 8-14 8z" />
              </svg>
              {t.cta}
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
