"use client";

import SearchHub from "./search-hub";

/**
 * Right side of the desktop bar. Account, theme and language now live in the
 * menu drawer (see navbar.tsx), so the bar keeps only search.
 * SearchHub owns the Cmd/Ctrl+K shortcut.
 */
export default function NavbarActions() {
  return (
    <div className="hidden items-center lg:flex">
      <SearchHub />
    </div>
  );
}
