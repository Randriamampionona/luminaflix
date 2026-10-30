"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { recordActivity } from "@/action/user-stats.action";
import { markGoodMoment } from "@/lib/good-moments";

/**
 * - Counts visits (one per tab); from the 3rd visit, 45 s on the site is a
 *   "good moment" to offer the app / an account (lib/good-moments.ts).
 * - Signed-in users: one "visit" per day for their streak (lib/user-stats-server.ts).
 */
export default function EngagementTracker() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!sessionStorage.getItem("lf_visit_counted")) {
        sessionStorage.setItem("lf_visit_counted", "1");
        localStorage.setItem("lf_visit_count", String((Number(localStorage.getItem("lf_visit_count")) || 0) + 1));
      }
      if ((Number(localStorage.getItem("lf_visit_count")) || 0) >= 3) {
        timer = setTimeout(() => markGoodMoment("visits"), 45_000);
      }
    } catch {
      // storage blocked
    }
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = `lf_activity_day_${userId}`;
    try {
      if (localStorage.getItem(key) === day) return;
      localStorage.setItem(key, day);
    } catch {
      return;
    }
    void recordActivity("visit").catch(() => {});
  }, [isLoaded, userId]);

  return null;
}
