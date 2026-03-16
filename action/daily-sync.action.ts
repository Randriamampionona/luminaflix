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
    ? process.env.NEXT_PUBLIC_DOMAIN
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
          subject: `[LUMINA] ⚡ Daily Transmission | Intelligence Update`,
          sender: { email: "tojorandria474@gmail.com", name: "Lumina" },
          to: [{ email: user.email, name: user.firstName }],
          cc: [{ email: "tojorandriaii474@gmail.com", name: "Ops Manager" }],
          htmlContent: `<div style="background-color: #020405; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;">
            <div style="max-width: 600px; margin: auto; background: #05080a; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7);">
              
              <div style="padding: 16px 24px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 6px; height: 6px; background: #06b6d4; border-radius: 50%; box-shadow: 0 0 8px #06b6d4;"></div>
                  <span style="color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8;">Secure Stream Active</span>
                </div>
                <span style="color: #475569; font-size: 10px; font-weight: 500; font-family: monospace; margin-left: 7px;">${new Date().toISOString().replace("T", " // ").slice(0, 19)}</span>
              </div>

              <div style="position: relative; padding: 40px 30px; background: linear-gradient(180deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%);">
                <h1 style="margin: 0; font-size: 12px; font-weight: 800; color: #06b6d4; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 12px;">LUMINA OS</h1>
                <h2 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -1px; line-height: 1.1;">Intercepting new <br/>visual signals for <span style="color: #06b6d4;">${user.firstName || "Operative"}</span>.</h2>
              </div>

              <div style="padding: 0 24px 32px 24px;">
                <div style="background: #0d1117; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden;">
                  <div style="position: relative;">
                    <img src="https://image.tmdb.org/t/p/w780${m?.backdrop_path || m?.poster_path}" style="width: 100%; display: block;" />
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, #0d1117 0%, transparent 50%);"></div>
                    <div style="position: absolute; bottom: 20px; left: 20px;">
                      <span style="background: #ffffff; color: #000000; font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">Top Priority</span>
                    </div>
                  </div>
                  
                  <div style="padding: 24px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 24px; color: #ffffff; font-weight: 700;">${m?.title}</h3>
                    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">${truncate(m?.overview, 140)}</p>
                    
                    <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #06b6d4; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(6, 182, 212, 0.4);">
                      Initialize Link →
                    </a>
                  </div>
                </div>
              </div>

              <div style="padding: 0 24px 40px 24px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="48%" valign="top">
                      <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                        <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                        <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">K-Drama</p>
                        <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${d?.name}</h4>
                        <a href="${domain}/k-drama/${d?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                      </div>
                    </td>
                    <td width="4%"></td>
                    <td width="48%" valign="top">
                      <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                        <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                        <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Anime</p>
                        <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${a?.name}</h4>
                        <a href="${domain}/anime/${a?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="padding: 32px 24px; background: rgba(255, 255, 255, 0.02); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
                <div style="margin-bottom: 16px;">
                  <span style="color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">LUMINA_PROTOCOL // ENCRYPTED</span>
                </div>
                <div style="font-size: 11px; color: #64748b;">
                  <a href="#" style="color: #64748b; text-decoration: none;">Security Settings</a>
                  <span style="margin: 0 10px; opacity: 0.2;">|</span>
                  <a href="#" style="color: #64748b; text-decoration: none;">End Session</a>
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
        htmlContent: `<div style="background-color: #020405; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;">
        <div style="max-width: 600px; margin: auto; background: #05080a; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7);">
          
          <div style="padding: 16px 24px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 6px; height: 6px; background: #06b6d4; border-radius: 50%; box-shadow: 0 0 8px #06b6d4;"></div>
              <span style="color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8;">Secure Stream Active</span>
            </div>
            <span style="color: #475569; font-size: 10px; font-weight: 500; font-family: monospace; margin-left: 7px;">${new Date().toISOString().replace("T", " // ").slice(0, 19)}</span>
          </div>

          <div style="position: relative; padding: 40px 30px; background: linear-gradient(180deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%);">
            <h1 style="margin: 0; font-size: 12px; font-weight: 800; color: #06b6d4; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 12px;">LUMINA OS</h1>
            <h2 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -1px; line-height: 1.1;">Intercepting new <br/>visual signals for <span style="color: #06b6d4;">Tooj</span>.</h2>
          </div>

          <div style="padding: 0 24px 32px 24px;">
            <div style="background: #0d1117; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden;">
              <div style="position: relative;">
                <img src="https://image.tmdb.org/t/p/w780${m?.backdrop_path || m?.poster_path}" style="width: 100%; display: block;" />
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, #0d1117 0%, transparent 50%);"></div>
                <div style="position: absolute; bottom: 20px; left: 20px;">
                  <span style="background: #ffffff; color: #000000; font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">Top Priority</span>
                </div>
              </div>
              
              <div style="padding: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 24px; color: #ffffff; font-weight: 700;">${m?.title}</h3>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">${truncate(m?.overview, 140)}</p>
                
                <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #06b6d4; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(6, 182, 212, 0.4);">
                  Initialize Link →
                </a>
              </div>
            </div>
          </div>

          <div style="padding: 0 24px 40px 24px;">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="48%" valign="top">
                  <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                    <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                    <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">K-Drama</p>
                    <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${d?.name}</h4>
                    <a href="${domain}/k-drama/${d?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                  </div>
                </td>
                <td width="4%"></td>
                <td width="48%" valign="top">
                  <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                    <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                    <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Anime</p>
                    <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${a?.name}</h4>
                    <a href="${domain}/anime/${a?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding: 32px 24px; background: rgba(255, 255, 255, 0.02); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
            <div style="margin-bottom: 16px;">
              <span style="color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">LUMINA_PROTOCOL // ENCRYPTED</span>
            </div>
            <div style="font-size: 11px; color: #64748b;">
              <a href="#" style="color: #64748b; text-decoration: none;">Security Settings</a>
              <span style="margin: 0 10px; opacity: 0.2;">|</span>
              <a href="#" style="color: #64748b; text-decoration: none;">End Session</a>
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
