import { REVALIDATE, tmdb } from "@/lib/tmdb";

interface Video {
  key: string;
  site: string;
  type: string;
  iso_639_1: string;
}

const pickTrailer = (videos: Video[]) =>
  videos.find((v) => v.type === "Trailer" && v.site === "YouTube") ??
  videos.find((v) => v.type === "Teaser" && v.site === "YouTube") ??
  videos.find((v) => v.site === "YouTube");

export async function getMovieTrailer(id: string, requestedLang?: string, type?: string) {
  if (!/^\d+$/.test(id)) return null;
  const language = requestedLang === "en" ? "en-US" : "fr-FR";
  const primary: "movie" | "tv" = type === "anime" || type === "tv" || type === "k-drama" ? "tv" : "movie";
  const secondary = primary === "movie" ? "tv" : "movie";

  const fetchVideos = async (mediaType: "movie" | "tv", lang: string) => {
    const data = await tmdb<{ results?: Video[] }>(
      `/${mediaType}/${id}/videos`,
      { language: lang },
      { revalidate: REVALIDATE.long, localized: false },
    );
    return data?.results?.length ? pickTrailer(data.results) : undefined;
  };

  // BUG FIX: the English fallback always tried "movie" first, even for series.
  const trailer =
    (await fetchVideos(primary, language)) ??
    (await fetchVideos(secondary, language)) ??
    (language !== "en-US"
      ? (await fetchVideos(primary, "en-US")) ?? (await fetchVideos(secondary, "en-US"))
      : undefined);

  return trailer ? { key: trailer.key, lang: trailer.iso_639_1 } : null;
}
