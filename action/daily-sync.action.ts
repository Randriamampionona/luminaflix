"use server";

import { BrevoClient } from "@getbrevo/brevo";
import { collection, getDocs } from "firebase/firestore";
import { getAllMovies } from "@/action/get-all-movies.action";
import { clientDb } from "@/lib/firebase";
import { getAllKDramas } from "./get-all-kdramas.action";
import { getAllAnime } from "./get-all-anime.action";

const IS_PROD = process.env.NODE_ENV === "production";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY!,
});

const truncate = (text: string, length: number) =>
  text?.length > length ? text.substring(0, length) + "..." : text;

const getRandomItem = (data: any) => {
  if (!data?.results || data.results.length === 0) return null;
  const randomIndex = Math.floor(
    Math.random() * Math.min(data.results.length, 15),
  );
  return data.results[randomIndex];
};

export async function triggerDailySync() {
  const domain = IS_PROD
    ? process.env.NEXT_PUBLIC_DOMAIN_NAME
    : "http://localhost:3000";
  const currentDate = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  try {
    // Generate a random page between 1 and 100 for each category
    const moviePage = Math.floor(Math.random() * 100) + 1;
    const dramaPage = Math.floor(Math.random() * 100) + 1;
    const animePage = Math.floor(Math.random() * 100) + 1;

    const [movieData, dramaData, animeData] = await Promise.all([
      getAllMovies(moviePage, "popularity.desc", "all", "All", "movie"),
      getAllKDramas(dramaPage, "popularity.desc", "all", "All"),
      getAllAnime(animePage, "popularity.desc", "all", "All"),
    ]);

    const m = getRandomItem(movieData);
    const d = getRandomItem(dramaData);
    const a = getRandomItem(animeData);

    const usersSnap = await getDocs(collection(clientDb, "USERS"));
    const recipients = usersSnap.docs.map((doc) => doc.data());

    if (IS_PROD) {
      const emailPromises = recipients.map((user: any) => {
        return brevo.transactionalEmails.sendTransacEmail({
          subject: `[LUMINA] New Signals Intercepted: ${m?.title || "Update"}`,
          sender: { email: "tojorandria474@gmail.com", name: "Lumina" },
          to: [{ email: user.email, name: user.firstName }],
          cc: [{ email: "tojorandriaii474@gmail.com", name: "Ops Manager" }],
          htmlContent: `<div style="background-color: #020405; padding: 50px 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: auto; background: #05080a; border: 1px solid #161b22; border-radius: 32px; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.8);">
    
    <div style="background: linear-gradient(to bottom, #0f172a, #05080a); padding: 40px 20px; text-align: center; border-bottom: 1px solid rgba(6, 182, 212, 0.1);">
      <h1 style="margin: 0; font-size: 32px; font-weight: 100; letter-spacing: 12px; color: #ffffff; text-transform: uppercase;">
        LUMINA<span style="color: #06b6d4; font-weight: 900;">.</span>
      </h1>
      <div style="height: 1px; width: 60px; background: linear-gradient(to right, transparent, #06b6d4, transparent); margin: 15px auto;"></div>
      <p style="margin: 0; font-size: 10px; color: #06b6d4; letter-spacing: 4px; font-weight: 700; text-transform: uppercase;">Aperture Intelligence</p>
    </div>

    <div style="padding: 40px 30px; text-align: center;">
      <h2 style="font-size: 28px; font-weight: 600; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.5px;">Welcome back, ${user.firstName || "Operative"}.</h2>
      <p style="font-size: 15px; color: #8899a6; line-height: 1.6; margin: 0 auto; max-width: 440px;">
        The system has synchronized. We’ve isolated three high-frequency signals for your immediate review.
      </p>
    </div>

    <div style="padding: 0 30px 40px 30px;">
      <div style="background: #0d1117; border-radius: 24px; border: 1px solid #30363d; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
        
        <img src="https://image.tmdb.org/t/p/w780${m?.backdrop_path || m?.poster_path}" style="width: 100%; display: block; filter: brightness(0.9);" />
        
        <div style="background: rgba(6, 182, 212, 0.05); border-top: 2px solid #06b6d4; border-bottom: 1px solid rgba(6, 182, 212, 0.1); padding: 8px 20px;">
           <span style="color: #06b6d4; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Target Identified: Top Priority</span>
        </div>
        
        <div style="padding: 30px; text-align: left; background: linear-gradient(180deg, #0d1117 0%, #05080a 100%);">
          <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #ffffff; font-weight: 700;">${m?.title}</h2>
          <p style="font-size: 14px; color: #8b949e; line-height: 1.6; margin-bottom: 25px;">${truncate(m?.overview, 150)}</p>
          <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #ffffff; color: #000000; padding: 14px 35px; text-decoration: none; font-weight: 800; font-size: 13px; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px;">Initialize Stream</a>
        </div>
      </div>
    </div>

    <div style="padding: 0 30px 50px 30px;">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="48%" valign="top">
            <div style="background: #0d1117; border-radius: 20px; border: 1px solid #21262d; overflow: hidden;">
              <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" style="width: 100%; display: block;" />
              <div style="padding: 20px;">
                <p style="color: #06b6d4; font-size: 10px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">K-Drama</p>
                <h3 style="font-size: 15px; color: #ffffff; margin: 0 0 15px 0; font-weight: 600; line-height: 1.3;">${d?.name}</h3>
                <a href="${domain}/k-drama/${d?.id}" style="color: #ffffff; font-size: 12px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #06b6d4; padding-bottom: 2px;">Access Files →</a>
              </div>
            </div>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top">
            <div style="background: #0d1117; border-radius: 20px; border: 1px solid #21262d; overflow: hidden;">
              <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" style="width: 100%; display: block;" />
              <div style="padding: 20px;">
                <p style="color: #06b6d4; font-size: 10px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Anime</p>
                <h3 style="font-size: 15px; color: #ffffff; margin: 0 0 15px 0; font-weight: 600; line-height: 1.3;">${a?.name}</h3>
                <a href="${domain}/anime/${a?.id}" style="color: #ffffff; font-size: 12px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #06b6d4; padding-bottom: 2px;">Access Files →</a>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #010409; padding: 40px 20px; text-align: center; border-top: 1px solid #21262d;">
      <p style="font-size: 11px; color: #484f58; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">
        Transmitted by Lumina Secure Core
      </p>
      <div style="font-size: 11px;">
        <a href="#" style="color: #8b949e; text-decoration: none; margin: 0 12px;">Security Protocol</a>
        <span style="color: #30363d;">•</span>
        <a href="#" style="color: #8b949e; text-decoration: none; margin: 0 12px;">Terminal Exit</a>
      </div>
    </div>
  </div>
          </div>`,
        });
      });
      await Promise.all(emailPromises);
      return { success: true, count: recipients.length };
    } else {
      await brevo.transactionalEmails.sendTransacEmail({
        subject: `[LUMINA] New Signals Intercepted: ${m?.title || "Update"}`,
        sender: { email: "tojorandria474@gmail.com", name: "Lumina" },
        to: [{ email: "tojorandriaii474@gmail.com", name: "Developer" }],
        cc: [{ email: "joodev08@gmail.com", name: "Ops Manager" }],
        htmlContent: `<div style="background-color: #020405; padding: 50px 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: auto; background: #05080a; border: 1px solid #161b22; border-radius: 32px; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.8);">
    
    <div style="background: linear-gradient(to bottom, #0f172a, #05080a); padding: 40px 20px; text-align: center; border-bottom: 1px solid rgba(6, 182, 212, 0.1);">
      <h1 style="margin: 0; font-size: 32px; font-weight: 100; letter-spacing: 12px; color: #ffffff; text-transform: uppercase;">
        LUMINA<span style="color: #06b6d4; font-weight: 900;">.</span>
      </h1>
      <div style="height: 1px; width: 60px; background: linear-gradient(to right, transparent, #06b6d4, transparent); margin: 15px auto;"></div>
      <p style="margin: 0; font-size: 10px; color: #06b6d4; letter-spacing: 4px; font-weight: 700; text-transform: uppercase;">Aperture Intelligence</p>
    </div>

    <div style="padding: 40px 30px; text-align: center;">
      <h2 style="font-size: 28px; font-weight: 600; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.5px;">Welcome back, Operative.</h2>
      <p style="font-size: 15px; color: #8899a6; line-height: 1.6; margin: 0 auto; max-width: 440px;">
        The system has synchronized. We’ve isolated three high-frequency signals for your immediate review.
      </p>
    </div>

    <div style="padding: 0 30px 40px 30px;">
      <div style="background: #0d1117; border-radius: 24px; border: 1px solid #30363d; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
        
        <img src="https://image.tmdb.org/t/p/w780${m?.backdrop_path || m?.poster_path}" style="width: 100%; display: block; filter: brightness(0.9);" />
        
        <div style="background: rgba(6, 182, 212, 0.05); border-top: 2px solid #06b6d4; border-bottom: 1px solid rgba(6, 182, 212, 0.1); padding: 8px 20px;">
           <span style="color: #06b6d4; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Target Identified: Top Priority</span>
        </div>
        
        <div style="padding: 30px; text-align: left; background: linear-gradient(180deg, #0d1117 0%, #05080a 100%);">
          <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #ffffff; font-weight: 700;">${m?.title}</h2>
          <p style="font-size: 14px; color: #8b949e; line-height: 1.6; margin-bottom: 25px;">${truncate(m?.overview, 150)}</p>
          <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #ffffff; color: #000000; padding: 14px 35px; text-decoration: none; font-weight: 800; font-size: 13px; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px;">Initialize Stream</a>
        </div>
      </div>
    </div>

    <div style="padding: 0 30px 50px 30px;">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="48%" valign="top">
            <div style="background: #0d1117; border-radius: 20px; border: 1px solid #21262d; overflow: hidden;">
              <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" style="width: 100%; display: block;" />
              <div style="padding: 20px;">
                <p style="color: #06b6d4; font-size: 10px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">K-Drama</p>
                <h3 style="font-size: 15px; color: #ffffff; margin: 0 0 15px 0; font-weight: 600; line-height: 1.3;">${d?.name}</h3>
                <a href="${domain}/k-drama/${d?.id}" style="color: #ffffff; font-size: 12px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #06b6d4; padding-bottom: 2px;">Access Files →</a>
              </div>
            </div>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top">
            <div style="background: #0d1117; border-radius: 20px; border: 1px solid #21262d; overflow: hidden;">
              <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" style="width: 100%; display: block;" />
              <div style="padding: 20px;">
                <p style="color: #06b6d4; font-size: 10px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Anime</p>
                <h3 style="font-size: 15px; color: #ffffff; margin: 0 0 15px 0; font-weight: 600; line-height: 1.3;">${a?.name}</h3>
                <a href="${domain}/anime/${a?.id}" style="color: #ffffff; font-size: 12px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #06b6d4; padding-bottom: 2px;">Access Files →</a>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #010409; padding: 40px 20px; text-align: center; border-top: 1px solid #21262d;">
      <p style="font-size: 11px; color: #484f58; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">
        Transmitted by Lumina Secure Core
      </p>
      <div style="font-size: 11px;">
        <a href="#" style="color: #8b949e; text-decoration: none; margin: 0 12px;">Security Protocol</a>
        <span style="color: #30363d;">•</span>
        <a href="#" style="color: #8b949e; text-decoration: none; margin: 0 12px;">Terminal Exit</a>
      </div>
    </div>
  </div>
        </div>`,
      });
      return { success: true, count: 1 };
    }
  } catch (error: any) {
    console.error(
      "BREVO ERROR DETAILS:",
      error.response?.body || error.message,
    );
    return { success: false, error: error.message };
  }
}
