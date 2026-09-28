"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/layout/skeletons";

/**
 * Signed-in account summary for the menu drawer: avatar, name, email,
 * membership badge, and quick actions (manage account, sign out).
 * `onAction` closes the drawer first so Clerk's modal isn't stacked under it.
 */
export default function AccountCard({ onAction }: { onAction?: () => void }) {
  const t = useTranslations("auth");
  const { user, isLoaded } = useUser();
  const clerk = useClerk();

  if (!isLoaded || !user) return <AccountCardSkeleton />;

  return (
    <AccountCardView
      name={user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || t("account")}
      email={user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? ""}
      imageUrl={user.imageUrl}
      onManage={() => {
        onAction?.();
        clerk.openUserProfile();
      }}
      onSignOut={() => {
        onAction?.();
        void clerk.signOut({ redirectUrl: "/" });
      }}
    />
  );
}

function AccountCardSkeleton() {
  return (
    <div className="rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="grow space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>
  );
}

function AccountCardView({
  name,
  email,
  imageUrl,
  onManage,
  onSignOut,
}: {
  name: string;
  email: string;
  imageUrl?: string;
  onManage: () => void;
  onSignOut: () => void;
}) {
  const t = useTranslations("auth");
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-sm">
      {/* Soft brand glow behind the avatar */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -left-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl"
      />

      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <div aria-hidden className="absolute -inset-0.5 rounded-full bg-linear-to-tr from-cyan-500 to-blue-600" />
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar (the global image loader is TMDB-only)
            <img src={imageUrl} alt="" className="relative h-14 w-14 rounded-full border-2 border-surface object-cover" />
          ) : (
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-surface bg-elevated text-sm font-black text-foreground">
              {initials}
            </span>
          )}
          <span
            aria-hidden
            className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-surface bg-emerald-500"
          />
        </div>

        <div className="min-w-0 grow">
          <p className="truncate text-base font-black tracking-tight text-foreground" title={name}>
            {name}
          </p>
          {email && (
            <p className="truncate text-xs text-fg-muted" title={email}>
              {email}
            </p>
          )}
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-brand">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {t("memberBadge")}
          </span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onManage}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-strong bg-tint py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:border-cyan-500/50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Settings className="h-3.5 w-3.5" aria-hidden />
          {t("manageAccount")}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-strong bg-tint py-2.5 text-[10px] font-black uppercase tracking-widest text-fg-muted transition-colors hover:border-red-500/40 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}
