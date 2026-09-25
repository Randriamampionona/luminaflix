"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import SignInLink from "@/components/auth/sign-in-link";
import SearchHub from "./search-hub";
import UserTerminal from "./user-terminal";

/**
 * CLEANUP: the previous version registered its own Cmd/Ctrl+K listener that
 * focused an input which no longer existed, racing with SearchHub's listener.
 * SearchHub owns the shortcut now.
 */
export default function NavbarActions() {
  const t = useTranslations("auth");

  return (
    <div className="hidden items-center gap-4 lg:flex">
      <SearchHub />
      <div aria-hidden className="h-6 w-px bg-white/10" />
      <div className="flex items-center gap-2">
        <SignedOut>
          <SignInLink className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 transition-colors hover:text-white">
            {t("signIn")}
          </SignInLink>
          <SignInLink
            route="/sign-up"
            className="group flex items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <span className="whitespace-nowrap text-sm font-black uppercase italic tracking-tighter text-black">
              {t("join")}
            </span>
            <ArrowRight className="h-4 w-4 text-black" />
          </SignInLink>
        </SignedOut>
        <SignedIn>
          <UserTerminal />
        </SignedIn>
      </div>
    </div>
  );
}
