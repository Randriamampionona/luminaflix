import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getNewestUsers } from "@/action/get-newest-users.action";
import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/layout/skeletons";
import NewUsersCarousel from "./new-users-carousel";

/** Days at the start of each month during which the banner is shown (1–7 inclusive). */
const WELCOME_DAYS = 7;
/** Day boundaries are evaluated in this zone, not in the server's UTC clock. */
const WELCOME_TIME_ZONE = process.env.NEWEST_USERS_TIME_ZONE || "Europe/Paris";

/**
 * True from the 1st (00:00) to the 7th (23:59:59) of every month.
 * Evaluated on the server, so outside the window nothing is rendered and
 * Firestore isn't queried at all.
 */
export function isWelcomeWindow(now = new Date()) {
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: WELCOME_TIME_ZONE }).format(now));
  return day >= 1 && day <= WELCOME_DAYS;
}

function BannerShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="py-4 sm:py-6">
      <Container>
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface/70 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-5 sm:p-2 sm:pl-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-cyan-500/15 blur-3xl"
          />
          {children}
        </div>
      </Container>
    </section>
  );
}

/** "Welcome to our newest Luminas!" strip with the 11 latest sign-ups. */
export default async function NewUsersBanner() {
  const [t, users] = await Promise.all([getTranslations("home.newUsers"), getNewestUsers()]);
  if (users.length === 0) return null;

  return (
    <BannerShell>
      <div className="relative flex shrink-0 items-center gap-3 px-1 sm:px-0">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Sparkles className="size-4.5" aria-hidden />
        </span>
        <div className="leading-tight">
          <h2 className="text-sm font-black tracking-tight text-foreground">{t("title")}</h2>
          <p className="text-[11px] text-fg-muted">{t("subtitle", { count: users.length })}</p>
        </div>
      </div>
      <div aria-label={t("label")} role="region" className="relative flex min-w-0 flex-1">
        <NewUsersCarousel users={users} />
      </div>
    </BannerShell>
  );
}

export function NewUsersBannerSkeleton() {
  return (
    <BannerShell>
      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-2.5 w-36" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-36 shrink-0 rounded-full" />
        ))}
      </div>
    </BannerShell>
  );
}