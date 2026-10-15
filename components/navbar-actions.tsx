"use client";

import GetAppLink from "@/components/download-app/get-app-link";
import SearchHub from "./search-hub";

/**
 * Right side of the desktop bar. Account, theme and language now live in the
 * menu drawer (see navbar.tsx), so the bar keeps the "App" pill and search.
 * SearchHub owns the Cmd/Ctrl+K shortcut.
 */
export default function NavbarActions() {
  return (
    <div className="hidden items-center gap-3 md:flex">
      <GetAppLink variant="nav" />
      <div className="hidden lg:block">
        <SearchHub />
      </div>
    </div>
  );
}
