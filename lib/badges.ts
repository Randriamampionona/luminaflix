/**
 * Badges and points (shown on /user-rank, in the menu and on the home page).
 * Stats come from USER_STATS/{userId} (lib/user-stats-server.ts).
 */
export interface UserStats {
  streak: number;
  bestStreak: number;
  activeDays: number;
  watched: { movie: number; tv: number; kdrama: number; anime: number };
  points: number;
}

type BadgeId =
  | "firstWatch"
  | "streak3"
  | "streak7"
  | "streak30"
  | "movieBuff"
  | "kdramaFan"
  | "animeExplorer"
  | "seriesBinger"
  | "allRounder"
  | "regular";

interface BadgeDef {
  id: BadgeId;
  emoji: string;
  /** Translation keys under badges.items.<id> (name, hint). */
  test: (s: UserStats) => boolean;
}

const total = (s: UserStats) => s.watched.movie + s.watched.tv + s.watched.kdrama + s.watched.anime;

export const BADGES: BadgeDef[] = [
  { id: "firstWatch", emoji: "🎬", test: (s) => total(s) >= 1 },
  { id: "streak3", emoji: "🔥", test: (s) => s.bestStreak >= 3 },
  { id: "streak7", emoji: "⚡", test: (s) => s.bestStreak >= 7 },
  { id: "streak30", emoji: "👑", test: (s) => s.bestStreak >= 30 },
  { id: "movieBuff", emoji: "🍿", test: (s) => s.watched.movie >= 10 },
  { id: "kdramaFan", emoji: "💜", test: (s) => s.watched.kdrama >= 5 },
  { id: "animeExplorer", emoji: "🌸", test: (s) => s.watched.anime >= 5 },
  { id: "seriesBinger", emoji: "📺", test: (s) => s.watched.tv >= 10 },
  { id: "allRounder", emoji: "🌍", test: (s) => s.watched.movie > 0 && s.watched.tv > 0 && s.watched.kdrama > 0 && s.watched.anime > 0 },
  { id: "regular", emoji: "📅", test: (s) => s.activeDays >= 20 },
];

export const earnedBadges = (s: UserStats) => BADGES.filter((b) => b.test(s)).map((b) => b.id);

/** 10 per title watched, 5 per best-streak day, 2 per active day. */
export const pointsFor = (s: Omit<UserStats, "points">) => total(s as UserStats) * 10 + s.bestStreak * 5 + s.activeDays * 2;

export const EMPTY_STATS: UserStats = {
  streak: 0,
  bestStreak: 0,
  activeDays: 0,
  watched: { movie: 0, tv: 0, kdrama: 0, anime: 0 },
  points: 0,
};
