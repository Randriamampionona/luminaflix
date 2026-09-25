"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function UserTerminal() {
  const t = useTranslations("auth");
  const { user, isLoaded } = useUser();

  // Reserve the space while Clerk loads to avoid a navbar layout shift.
  if (!isLoaded || !user) return <div aria-hidden className="h-13.5 w-40" />;

  return (
    <div className="group relative flex items-center gap-3 rounded-md border border-white/5 bg-zinc-900/40 p-2 backdrop-blur-md transition-colors duration-500 hover:border-cyan-500/50">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <span className="max-w-28 truncate text-[10px] font-black uppercase italic leading-none tracking-tighter text-white">
            {user.firstName || user.username || t("account")}
          </span>
          <ShieldCheck className="h-3 w-3 text-cyan-500" />
        </div>
        <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors group-hover:text-cyan-400">
          {t("memberBadge")}
        </span>
      </div>

      <div className="relative">
        <div aria-hidden className="absolute -inset-1 rounded-full bg-linear-to-tr from-cyan-500 to-blue-600 opacity-20 blur-xs transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex items-center justify-center rounded-full bg-black">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9.5 h-9.5 rounded-full border border-white/10",
                userButtonPopoverCard: "bg-zinc-950 border border-white/10 backdrop-blur-xl",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
