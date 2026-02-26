"use server";

import { collection, getDocs } from "firebase/firestore";
import emailjs from "@emailjs/nodejs";
import { getAllMovies } from "@/action/get-all-movies.action";
import { clientDb } from "@/lib/firebase";
import { getAllKDramas } from "./get-all-kdramas.action";

type User = { firstName: string; email: string };

// Helper to keep the email clean by shortening long TMDB overviews
const truncate = (text: string, length: number) =>
  text?.length > length ? text.substring(0, length) + "..." : text;

// Helper to pick a random item from the top results to keep the feed fresh
const getRandomItem = (data: any) => {
  if (!data?.results || data.results.length === 0) return null;
  // We pick from the top 15 to ensure we only recommend high-quality popular content
  const randomIndex = Math.floor(
    Math.random() * Math.min(data.results.length, 15),
  );
  return data.results[randomIndex];
};

export async function triggerDailySync() {
  const isProd = process.env.NODE_ENV === "production";
  const TEST_EMAIL = "toojdev08@gmail.com";

  console.log(
    `[LUMINA SYNC] 🛰️ Initiating broadcast in ${isProd ? "PRODUCTION" : "DEVELOPMENT"} mode...`,
  );

  try {
    // 1. Fetch Content from TMDB Sectors (Page 1, Popularity Descending)
    const [movieData, dramaData, animeData] = await Promise.all([
      getAllMovies(1, "popularity.desc", "all", "All", "movie"),
      getAllKDramas(1, "popularity.desc", "all", "All", "tv"),
      getAllMovies(1, "popularity.desc", "16", "All", "tv"), // 16 = Animation
    ]);

    // Randomize selection so users don't see the same thing every day
    const latestMovie = getRandomItem(movieData);
    const latestDrama = getRandomItem(dramaData);
    const latestAnime = getRandomItem(animeData);

    console.log(
      `[LUMINA SYNC] 🎲 Random Selection: [Movie: ${latestMovie?.title}] [Drama: ${latestDrama?.name}] [Anime: ${latestAnime?.name}]`,
    );

    // 2. Deployment-Aware Logic
    let recipients: User[] = [];

    if (isProd) {
      // PRODUCTION: Get all operatives from Firestore
      const usersSnap = await getDocs(collection(clientDb, "USERS"));
      recipients = usersSnap.docs.map((doc) => doc.data() as User);
    } else {
      // DEVELOPMENT: Manual test mode targeting only your dev email
      recipients = [{ firstName: "Tooj", email: TEST_EMAIL }];
    }

    console.log(`[LUMINA SYNC] 👥 Targeted Operatives: ${recipients.length}`);

    // 3. EmailJS Transmission with PRO Modern Data
    const emailPromises = recipients.map((user) => {
      return emailjs
        .send(
          process.env.EMAILJS_SERVICE_ID!,
          process.env.EMAILJS_YOUR_TEMPLATE_ID!,
          {
            // System Variables
            domain_name: isProd
              ? process.env.PROD_DOMAIN_NAME!
              : "http://localhost:3000",
            user_name: user.firstName || "Operative",
            user_email: user.email,
            date: new Date().toLocaleDateString(),

            // Movie Sector
            movie_title: latestMovie?.title || "Latest Blockbuster",
            movie_description: truncate(latestMovie?.overview, 150),
            movie_poster: latestMovie?.poster_path,
            movie_id: latestMovie?.id,

            // Drama Sector
            drama_title: latestDrama?.name || "Trending K-Drama",
            drama_description: truncate(latestDrama?.overview, 150),
            drama_poster: latestDrama?.poster_path,
            drama_id: latestDrama?.id,

            // Anime Sector
            anime_title: latestAnime?.name || "New Anime Release",
            anime_description: truncate(latestAnime?.overview, 150),
            anime_poster: latestAnime?.poster_path,
            anime_id: latestAnime?.id,
          },
          {
            publicKey: process.env.EMAILJS_PUBLIC_KEY!,
            privateKey: process.env.EMAILJS_PRIVATE_KEY!,
          },
        )
        .then(() => {
          console.log(`[LUMINA SYNC] ✅ Transmission Secure: ${user.email}`);
        })
        .catch((err) => {
          const errorMsg = err.text || err.message || "Unknown Error";
          console.error(
            `[LUMINA SYNC] ❌ Transmission Failure [${user.email}]:`,
            errorMsg,
          );
          throw new Error(errorMsg);
        });
    });

    await Promise.all(emailPromises);

    console.log(
      `[LUMINA SYNC] 🏁 Broadcast Complete. Total: ${recipients.length} successful transmissions.`,
    );

    return {
      success: true,
      mode: isProd ? "PRODUCTION" : "DEVELOPMENT",
      count: recipients.length,
    };
  } catch (error: any) {
    console.error(`[LUMINA SYNC] 🚨 CRITICAL SYSTEM ERROR:`, error.message);
    return { success: false, error: error.message };
  }
}
