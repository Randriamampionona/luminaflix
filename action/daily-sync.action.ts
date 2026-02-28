"use server";

import { BrevoClient } from "@getbrevo/brevo";
import { collection, getDocs } from "firebase/firestore";
import { getAllMovies } from "@/action/get-all-movies.action";
import { clientDb } from "@/lib/firebase";
import { getAllKDramas } from "./get-all-kdramas.action";

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
    const [movieData, dramaData, animeData] = await Promise.all([
      getAllMovies(1, "popularity.desc", "all", "All", "movie"),
      getAllKDramas(1, "popularity.desc", "all", "All", "tv"),
      getAllMovies(1, "popularity.desc", "16", "All", "tv"),
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
          htmlContent: `
  <div style="background-color: #000000; color: #ffffff; padding: 20px; font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #1e293b;">
    <table width="100%" style="margin-bottom: 30px;">
      <tr>
        <td>
          <h1 style="margin: 0; text-transform: uppercase; font-style: italic; letter-spacing: -2px; font-size: 32px;">
            LUMINA<span style="color: #06b6d4;">.</span>
          </h1>
          <div style="height: 2px; width: 40px; background: #06b6d4; margin-top: 4px;"></div>
        </td>
        <td align="right">
          <p style="margin: 0; text-transform: uppercase; font-size: 10px; letter-spacing: 0.2em; color: #64748b;">
            PROTOCOL: ${currentDate}
          </p>
        </td>
      </tr>
    </table>
  
    <div style="margin-bottom: 35px; padding: 20px; border-left: 2px solid #06b6d4; background: rgba(6, 182, 212, 0.05);">
      <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #06b6d4; font-weight: bold;">
        // IDENTITY VERIFIED
      </p>
      <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
        Welcome back, ${user.firstName || "Operative"}.
      </h2>
      <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
        The core has finished processing the latest global cinematic feeds. We have identified three high-priority targets for your immediate attention. Access is restricted to your terminal—latency is minimal, resolution is optimized.
      </p>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #ffffff; font-family: monospace; opacity: 0.8;">
        > INITIALIZING STREAMING CHANNELS... <span style="color: #06b6d4;">[DONE]</span>
      </p>
    </div>
  
    <div style="background: #0f172a; border-radius: 12px; overflow: hidden; margin-bottom: 25px; border: 1px solid #1e293b;">
      <img src="https://image.tmdb.org/t/p/w500${m?.poster_path}" alt="Poster" style="width: 100%; height: auto; display: block;" />
      <div style="padding: 20px;">
        <span style="color: #06b6d4; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">[ TRENDING MOVIE ]</span>
        <h2 style="margin: 10px 0; font-size: 20px;">${m?.title || m?.name}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">${truncate(m?.overview, 160)}</p>
        <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #ffffff; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-transform: uppercase;">Launch Stream</a>
      </div>
    </div>
  
    <div style="background: #0f172a; border-radius: 12px; overflow: hidden; margin-bottom: 25px; border: 1px solid #1e293b;">
      <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" alt="Poster" style="width: 100%; height: auto; display: block;" />
      <div style="padding: 20px;">
        <span style="color: #06b6d4; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">[ K-DRAMA DROP ]</span>
        <h2 style="margin: 10px 0; font-size: 20px;">${d?.name || d?.title}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">${truncate(d?.overview, 160)}</p>
        <a href="${domain}/k-drama/${d?.id}" style="display: inline-block; border: 1px solid #ffffff; color: #ffffff; padding: 12px 25px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-transform: uppercase;">Enter Sector</a>
      </div>
    </div>
  
    <div style="background: #0f172a; border-radius: 12px; overflow: hidden; margin-bottom: 25px; border: 1px solid #1e293b;">
      <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" alt="Poster" style="width: 100%; height: auto; display: block;" />
      <div style="padding: 20px;">
        <span style="color: #06b6d4; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">[ ANIME UPDATE ]</span>
        <h2 style="margin: 10px 0; font-size: 20px;">${a?.name || a?.title}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">${truncate(a?.overview, 160)}</p>
        <a href="${domain}/anime/${a?.id}" style="display: inline-block; background: #06b6d4; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-transform: uppercase;">Sync Now</a>
      </div>
    </div>
  
    <p style="font-size: 10px; color: #475569; margin-top: 40px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
      Lumina Core Security Division — Sent to ${user.email}<br/>
      Authorized Access Only. All signals encrypted.
    </p>
  </div>
          `,
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
        htmlContent: `
  <div style="background-color: #000000; color: #ffffff; padding: 20px; font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #1e293b;">
    <table width="100%" style="margin-bottom: 30px;">
      <tr>
        <td>
          <h1 style="margin: 0; text-transform: uppercase; font-style: italic; letter-spacing: -2px; font-size: 32px;">
            LUMINA<span style="color: #06b6d4;">.</span>
          </h1>
          <div style="height: 2px; width: 40px; background: #06b6d4; margin-top: 4px;"></div>
        </td>
        <td align="right">
          <p style="margin: 0; text-transform: uppercase; font-size: 10px; letter-spacing: 0.2em; color: #64748b;">
            PROTOCOL: ${currentDate}
          </p>
        </td>
      </tr>
    </table>
  
    <div style="margin-bottom: 35px; padding: 20px; border-left: 2px solid #06b6d4; background: rgba(6, 182, 212, 0.05);">
      <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #06b6d4; font-weight: bold;">
        // IDENTITY VERIFIED
      </p>
      <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
        Welcome back, ${"Developer"}.
      </h2>
      <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
        The core has finished processing the latest global cinematic feeds. We have identified three high-priority targets for your immediate attention. Access is restricted to your terminal—latency is minimal, resolution is optimized.
      </p>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #ffffff; font-family: monospace; opacity: 0.8;">
        > INITIALIZING STREAMING CHANNELS... <span style="color: #06b6d4;">[DONE]</span>
      </p>
    </div>
  
    <div style="background: #0f172a; border-radius: 12px; overflow: hidden; margin-bottom: 25px; border: 1px solid #1e293b;">
      <img src="https://image.tmdb.org/t/p/w500${m?.poster_path}" alt="Poster" style="width: 100%; height: auto; display: block;" />
      <div style="padding: 20px;">
        <span style="color: #06b6d4; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">[ TRENDING MOVIE ]</span>
        <h2 style="margin: 10px 0; font-size: 20px;">${m?.title || m?.name}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">${truncate(m?.overview, 160)}</p>
        <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #ffffff; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-transform: uppercase;">Launch Stream</a>
      </div>
    </div>
  
    <div style="background: #0f172a; border-radius: 12px; overflow: hidden; margin-bottom: 25px; border: 1px solid #1e293b;">
      <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" alt="Poster" style="width: 100%; height: auto; display: block;" />
      <div style="padding: 20px;">
        <span style="color: #06b6d4; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">[ K-DRAMA DROP ]</span>
        <h2 style="margin: 10px 0; font-size: 20px;">${d?.name || d?.title}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">${truncate(d?.overview, 160)}</p>
        <a href="${domain}/k-drama/${d?.id}" style="display: inline-block; border: 1px solid #ffffff; color: #ffffff; padding: 12px 25px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-transform: uppercase;">Enter Sector</a>
      </div>
    </div>
  
    <div style="background: #0f172a; border-radius: 12px; overflow: hidden; margin-bottom: 25px; border: 1px solid #1e293b;">
      <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" alt="Poster" style="width: 100%; height: auto; display: block;" />
      <div style="padding: 20px;">
        <span style="color: #06b6d4; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">[ ANIME UPDATE ]</span>
        <h2 style="margin: 10px 0; font-size: 20px;">${a?.name || a?.title}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">${truncate(a?.overview, 160)}</p>
        <a href="${domain}/anime/${a?.id}" style="display: inline-block; background: #06b6d4; color: #000000; padding: 12px 25px; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 6px; text-transform: uppercase;">Sync Now</a>
      </div>
    </div>
  
    <p style="font-size: 10px; color: #475569; margin-top: 40px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
      Lumina Core Security Division — Sent to me<br/>
      Authorized Access Only. All signals encrypted.
    </p>
  </div>
          `,
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
