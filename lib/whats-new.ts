import { useSyncExternalStore } from "react";

/**
 * "What's new": the app's recent features, the NEW badges on them and the bell's
 * drawer. A feature stops being new for a visitor (saved in this browser) when
 * they click a link to it, press "Mark all as read", or after its `newUntil` date.
 *
 * To announce a feature: add it to FEATURES (newest first), add its texts under
 * "whatsNew.items.<id>" in the locales, and put <NewBadge feature="<id>" /> where
 * it should be pointed out (menu entries get theirs from `navKey`).
 */
export interface Feature {
  id: string;
  /** Page of the feature: any click on a link to it marks it as seen. */
  href: string;
  /** Release date (YYYY-MM-DD), shown in the drawer. */
  since: string;
  /** No longer "new" after this date, even if never opened (optional). */
  newUntil?: string;
  icon: "community" | "upload" | "news";
  /** Menu entry (lib/navigation.ts key) that gets the NEW badge. */
  navKey?: string;
}

export const FEATURES: Feature[] = [
  { id: "feeds", href: "/feeds", since: "2026-11-27", newUntil: "2027-01-31", icon: "news", navKey: "feeds" },
  {
    id: "community",
    href: "/community",
    since: "2026-11-26",
    newUntil: "2027-01-31",
    icon: "community",
    navKey: "community",
  },
  { id: "communityUpload", href: "/community/upload", since: "2026-11-26", newUntil: "2027-01-31", icon: "upload" },
];

const KEY = "lf_seen_features_v1";
const listeners = new Set<() => void>();
/** Ids of the features this visitor has seen (a new array on every change, for React). */
let seen: string[] | null = null;
const ALL_SEEN = FEATURES.map((f) => f.id); // server render: no badges (they appear after hydration)

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  seen = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable: forgotten after this visit
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Other tabs marking things as read
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      seen = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSeen = () => (seen ??= read());
const getServerSeen = () => ALL_SEEN;

const expired = (f: Feature) => !!f.newUntil && Date.now() > Date.parse(`${f.newUntil}T23:59:59Z`);

export function markFeatureSeen(id: string) {
  const current = getSeen();
  if (!current.includes(id)) write([...current, id]);
}

export function markAllFeaturesSeen() {
  write([...new Set([...getSeen(), ...FEATURES.map((f) => f.id)])]);
}

/** Features still new for this visitor. */
export function useUnseenFeatures() {
  const ids = useSyncExternalStore(subscribe, getSeen, getServerSeen);
  return FEATURES.filter((f) => !ids.includes(f.id) && !expired(f));
}

export function useIsNewFeature(id: string | undefined) {
  return useUnseenFeatures().some((f) => f.id === id);
}

/** The feature a link goes to (exact page), for "seen on click". */
export function featureForPath(pathname: string) {
  return FEATURES.find((f) => f.href === pathname.replace(/\/+$/, "") || (f.href === "/" && pathname === "/"));
}

export const navFeature = (navKey: string) => FEATURES.find((f) => f.navKey === navKey);
