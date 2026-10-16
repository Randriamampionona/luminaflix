import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { NewestUser } from "@/action/get-newest-users.action";
import { Container } from "@/components/layout/container";
import NewUsersCarousel from "./new-users-carousel";

/**
 * "Welcome to our newest Luminas!" strip with the latest sign-ups.
 * Shown while the welcome window is open — until the end of the 7th day after
 * the most recent sign-up (see getWelcomeBanner in action/get-newest-users.action.ts).
 */
export default async function NewUsersBanner({ users }: { users: NewestUser[] }) {
  const t = await getTranslations("home.newUsers");
  if (users.length === 0) return null;

  return (
    <section className="py-4 sm:py-6">
      <Container>
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface/70 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-5 sm:p-2 sm:pl-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-cyan-500/15 blur-3xl"
          />
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
        </div>
      </Container>
    </section>
  );
}
