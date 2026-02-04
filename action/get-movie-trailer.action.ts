"use server";

export async function getMovieTrailer(
  id: string,
  requestedLang?: string,
  type?: string, // Added the 3rd argument here
) {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;
  const langQuery = requestedLang === "en" ? "en-US" : "fr-FR";

  // Determine if we should start with 'tv' or 'movie'
  const initialType =
    type === "anime" || type === "tv" || type === "k-drama" ? "tv" : "movie";

  const fetchFromTMDB = async (tmdbType: "movie" | "tv", lang: string) => {
    try {
      const url = `${BASE_URL}/${tmdbType}/${id}/videos?api_key=${TMDB_API_KEY}&language=${lang}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results) return null;

      // Professional search: Prioritize Trailer, then Teaser (common for Anime)
      return (
        data.results.find(
          (v: any) => v.type === "Trailer" && v.site === "YouTube",
        ) ||
        data.results.find(
          (v: any) => v.type === "Teaser" && v.site === "YouTube",
        ) ||
        data.results[0] // Last resort: any video
      );
    } catch (e) {
      return null;
    }
  };

  try {
    // 1. Try with the primary type
    let trailer = await fetchFromTMDB(initialType, langQuery);

    // 2. If nothing found, try the opposite type (just in case)
    if (!trailer) {
      const backupType = initialType === "movie" ? "tv" : "movie";
      trailer = await fetchFromTMDB(backupType, langQuery);
    }

    // 3. Fallback to English if French was requested but empty
    if (!trailer && requestedLang === "fr") {
      trailer =
        (await fetchFromTMDB("movie", "en-US")) ||
        (await fetchFromTMDB("tv", "en-US"));
    }

    return trailer ? { key: trailer.key, lang: trailer.iso_639_1 } : null;
  } catch (error) {
    console.error("Lumina Action Error:", error);
    return null;
  }
}
