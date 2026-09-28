"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** localStorage key holding "light" | "dark" | "system". */
const THEME_STORAGE_KEY = "luminaflix:theme";

/**
 * Light / Dark / System theme.
 *
 * - `system` is the default and follows `prefers-color-scheme`; next-themes
 *   listens to `matchMedia("(prefers-color-scheme: dark)")` and updates live
 *   when the OS setting changes.
 * - The choice is persisted in localStorage (THEME_STORAGE_KEY) and synced
 *   across tabs.
 * - A blocking inline script sets the `dark` class on <html> before the first
 *   paint, so there is no flash of the wrong theme on load.
 * - `disableTransitionOnChange` switches instantly instead of animating every
 *   colour on the page.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark"]}
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
