"use client";

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { ArrowRight, ChevronDown, Loader2, Menu, Search, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { memo, useCallback, useState } from "react";
import AccountCard from "@/components/auth/account-card";
import SignInLink from "@/components/auth/sign-in-link";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { Container } from "@/components/layout/container";
import ThemeToggle from "@/components/theme-toggle";
import VoiceSearchButton from "@/components/voice-search-button";
import { useSmartSearch } from "@/hooks/use-smart-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useScrolled } from "@/hooks/use-scrolled";
import { NAV_INLINE_COUNT, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import NavbarActions from "./navbar-actions";

const inlineItems = NAV_ITEMS.slice(0, NAV_INLINE_COUNT);
const overflowItems = NAV_ITEMS.slice(NAV_INLINE_COUNT);

export const Logo = memo(function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const t = useTranslations("common");
  return (
    <Link
      href="/"
      className="group flex shrink-0 items-center gap-2"
      aria-label={`${t("brandFirst")}${t("brandSecond")} — ${t("home")}`}
    >
      <span
        className={cn(
          "flex rotate-3 items-center justify-center rounded-xl bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-transform duration-300 group-hover:rotate-0",
          size === "md" ? "h-10 w-10" : "h-8 w-8 rounded-lg",
        )}
      >
        <span className={cn("font-black italic leading-none text-black", size === "md" ? "text-xl" : "text-base")}>
          L
        </span>
      </span>
      <span className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
        {t("brandFirst")}
        <span className="text-brand">{t("brandSecond")}</span>
      </span>
    </Link>
  );
});

/** Hamburger button; shows the user's avatar when signed in. */
function MenuButton(props: React.ComponentProps<"button">) {
  const t = useTranslations("nav");
  const { user } = useUser();
  return (
    <button
      type="button"
      aria-label={t("openMenu")}
      {...props}
      className="relative flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-elevated/50 px-3 text-foreground transition-colors hover:border-cyan-500/50 hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <Menu className="h-5 w-5" aria-hidden />
      {user?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar (the global image loader is TMDB-only)
        <img src={user.imageUrl} alt="" className="h-7 w-7 rounded-full border border-line-strong object-cover" />
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fg-subtle">{children}</p>;
}

/**
 * Bar: logo, main links (xl+), search (lg+) and a menu button on every screen
 * size. Account, theme and language live in the menu drawer, which keeps the
 * bar uncluttered (no wrapping labels) at any width.
 */
export default function Navbar() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const isScrolled = useScrolled(20);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { searchHref } = useSmartSearch();

  // Keep the item highlighted on nested pages (e.g. /movies/123).
  const isActive = useCallback((href: string) => pathname === href || pathname.startsWith(`${href}/`), [pathname]);
  const isMoreActive = overflowItems.some((item) => isActive(item.href));

  const handleMobileSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    router.push(searchHref("/search", query));
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery("");
  };

  return (
    <nav
      aria-label={t("nav.mainNavigation")}
      className={cn(
        "fixed top-0 z-100 w-full transition-[padding,background-color] duration-500",
        isScrolled
          ? "border-b border-line bg-background/85 py-3 backdrop-blur-xl"
          : "bg-linear-to-b from-background/90 to-transparent py-5",
      )}
    >
      {/* UI STANDARD: same container as every page and the footer. */}
      <Container className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-10">
          <Logo />

          <div className="hidden items-center gap-8 xl:flex">
            {inlineItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-brand",
                  isActive(item.href) ? "text-brand" : "text-fg-muted",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "group flex cursor-pointer items-center gap-1 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-colors hover:text-brand focus-visible:text-brand",
                  isMoreActive ? "text-brand" : "text-fg-muted",
                )}
              >
                {t("nav.more")}
                <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-100 min-w-45 rounded-md border border-line-strong bg-surface/95 p-2 backdrop-blur-2xl">
                {overflowItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <DropdownMenuItem key={item.key} asChild>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-md px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors focus:bg-cyan-500 focus:text-black",
                          active ? "bg-tint text-brand" : "text-fg-muted",
                        )}
                      >
                        {t(`nav.${item.key}`)}
                        {active && <Zap className="h-3 w-3 fill-current" />}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <NavbarActions />

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <MenuButton />
            </SheetTrigger>

            <SheetContent
              side="right"
              showCloseButton={false}
              className="z-100 flex w-full flex-col border-line-strong bg-background/95 p-0 backdrop-blur-2xl sm:w-100 sm:max-w-100"
            >
              <div className="flex w-full shrink-0 items-center justify-between p-6">
                <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
                  {t("nav.menuTitle")}
                  <span className="text-brand">.</span>
                </SheetTitle>
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label={t("nav.closeMenu")}
                    className="rounded-xl border border-line-strong bg-elevated/50 p-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>

              <div className="flex flex-1 flex-col gap-10 overflow-y-auto px-6 pb-10 no-scrollbar">
                {/* Account */}
                <section className="space-y-3">
                  <SectionLabel>{t("nav.account")}</SectionLabel>
                  <SignedIn>
                    <AccountCard onAction={() => setIsOpen(false)} />
                  </SignedIn>
                  <SignedOut>
                    <div className="grid grid-cols-2 gap-3">
                      <SignInLink
                        onNavigate={() => setIsOpen(false)}
                        className="rounded-2xl border border-line-strong py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-foreground transition-colors hover:border-cyan-500/50"
                      >
                        {t("auth.signIn")}
                      </SignInLink>
                      <SignInLink
                        route="/sign-up"
                        onNavigate={() => setIsOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-inverse py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-inverse-fg transition-colors hover:bg-cyan-500 hover:text-black"
                      >
                        {t("auth.join")}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </SignInLink>
                    </div>
                  </SignedOut>
                </section>

                {/* Search (the bar has its own search from lg up) */}
                <form onSubmit={handleMobileSearch} role="search" className="group relative shrink-0 lg:hidden">
                  <div
                    aria-hidden
                    className={cn(
                      "absolute -inset-0.5 rounded-2xl bg-linear-to-r from-cyan-500 to-blue-600 blur transition duration-1000",
                      searchQuery ? "opacity-40" : "opacity-10",
                    )}
                  />
                  <div className="relative flex items-center overflow-hidden rounded-2xl border border-line-strong bg-surface">
                    <Search className={cn("ml-4 h-5 w-5", searchQuery ? "text-brand-bright" : "text-fg-subtle")} />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("search.mobilePlaceholder")}
                      aria-label={t("search.placeholder")}
                      className="w-full border-none bg-transparent px-4 py-4 text-sm font-bold uppercase tracking-widest text-foreground outline-none placeholder:text-fg-faint"
                    />
                    <VoiceSearchButton
                      size="md"
                      className="mr-2"
                      onTranscript={(text) => {
                        setIsOpen(false);
                        setSearchQuery("");
                        router.push(searchHref("/search", text));
                      }}
                    />
                    <button
                      type="submit"
                      aria-label={t("search.submit")}
                      className="mr-2 rounded-xl bg-inverse p-3 text-inverse-fg"
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                </form>

                {/* Navigation */}
                <section className="space-y-4">
                  <SectionLabel>{t("nav.menu")}</SectionLabel>
                  <div className="flex flex-col gap-4">
                    {NAV_ITEMS.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <SheetClose key={item.key} asChild>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "group flex items-center justify-between text-xl font-black uppercase italic tracking-tighter transition-colors",
                              active ? "text-foreground" : "text-fg-subtle hover:text-foreground",
                            )}
                          >
                            <span>{t(`nav.${item.key}`)}</span>
                            <Zap
                              className={cn(
                                "h-5 w-5 text-brand",
                                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                              )}
                            />
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </div>
                </section>

                {/* Preferences */}
                <section className="mt-auto space-y-4 rounded-3xl border border-line bg-tint-soft p-5">
                  <SectionLabel>{t("nav.preferences")}</SectionLabel>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-fg-muted">{t("theme.label")}</p>
                    <ThemeToggle variant="full" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-fg-muted">{t("language.label")}</p>
                    <LanguageSwitcher align="start" className="w-full justify-between" />
                  </div>
                </section>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </nav>
  );
}
