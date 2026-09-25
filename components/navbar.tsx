"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ArrowRight, ChevronDown, Loader2, Menu, Search, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { memo, useCallback, useState } from "react";
import SignInLink from "@/components/auth/sign-in-link";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { Container } from "@/components/layout/container";
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
    <Link href="/" className="group flex items-center gap-2" aria-label={`${t("brandFirst")}${t("brandSecond")} — ${t("home")}`}>
      <span
        className={cn(
          "flex rotate-3 items-center justify-center rounded-xl bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-transform duration-300 group-hover:rotate-0",
          size === "md" ? "h-10 w-10" : "h-8 w-8 rounded-lg",
        )}
      >
        <span className={cn("font-black italic leading-none text-black", size === "md" ? "text-xl" : "text-base")}>L</span>
      </span>
      <span className="text-2xl font-black uppercase italic tracking-tighter text-white">
        {t("brandFirst")}
        <span className="text-cyan-500">{t("brandSecond")}</span>
      </span>
    </Link>
  );
});

export default function Navbar() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const isScrolled = useScrolled(20);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Keep the item highlighted on nested pages (e.g. /movies/123).
  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );
  const isMoreActive = overflowItems.some((item) => isActive(item.href));

  const handleMobileSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    router.push(`/search/${encodeURIComponent(query)}`);
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery("");
  };

  return (
    <nav
      aria-label={t("nav.mainNavigation")}
      className={cn(
        "fixed top-0 z-100 w-full transition-[padding,background-color,border-color] duration-500",
        isScrolled ? "border-b border-white/5 bg-black/80 py-4 backdrop-blur-xl" : "bg-transparent py-6",
      )}
    >
      {/* UI STANDARD: same container as every page and the footer. */}
      <Container className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Logo />

          <div className="hidden items-center gap-8 xl:flex">
            {inlineItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-cyan-500",
                  isActive(item.href) ? "text-cyan-500" : "text-zinc-500",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "group flex cursor-pointer items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-colors hover:text-cyan-500 focus-visible:text-cyan-500",
                  isMoreActive ? "text-cyan-500" : "text-zinc-500",
                )}
              >
                {t("nav.more")}
                <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-100 min-w-45 rounded-md border border-white/10 bg-zinc-950/95 p-2 backdrop-blur-2xl">
                {overflowItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <DropdownMenuItem key={item.key} asChild>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-md px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors focus:bg-cyan-500 focus:text-black",
                          active ? "bg-white/5 text-cyan-500" : "text-zinc-400",
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

        <div className="flex items-center gap-4">
          <NavbarActions />
          <div className="hidden xl:block">
            <LanguageSwitcher />
          </div>

          <div className="flex items-center lg:hidden">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("nav.openMenu")}
                className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-white transition-colors hover:bg-zinc-800 xl:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              showCloseButton={false}
              className="z-100 flex w-full flex-col border-zinc-800 bg-black/95 p-0 backdrop-blur-2xl sm:w-100 sm:max-w-100"
            >
              <div className="flex w-full shrink-0 items-center justify-between p-6">
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label={t("nav.closeMenu")}
                    className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
                <LanguageSwitcher />
              </div>

              <div className="flex flex-1 flex-col overflow-y-auto p-8 no-scrollbar">
                <form onSubmit={handleMobileSearch} role="search" className="group relative mb-12 shrink-0">
                  <div
                    aria-hidden
                    className={cn(
                      "absolute -inset-0.5 rounded-2xl bg-linear-to-r from-cyan-500 to-blue-600 blur transition duration-1000",
                      searchQuery ? "opacity-40" : "opacity-10",
                    )}
                  />
                  <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                    <Search className={cn("ml-4 h-5 w-5", searchQuery ? "text-cyan-400" : "text-zinc-500")} />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("search.mobilePlaceholder")}
                      aria-label={t("search.placeholder")}
                      className="w-full border-none bg-transparent px-4 py-5 text-sm font-bold uppercase tracking-widest text-white outline-none placeholder:text-zinc-700"
                    />
                    <button type="submit" aria-label={t("search.submit")} className="mr-2 rounded-xl bg-white p-3 text-black">
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                </form>

                <SheetTitle className="mb-12 text-3xl font-black uppercase italic tracking-tighter text-white">
                  {t("nav.menu")}
                  <span className="text-cyan-500">.</span>
                </SheetTitle>

                <div className="mb-12 flex flex-col gap-6">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SheetClose key={item.key} asChild>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center justify-between font-black uppercase italic tracking-tighter transition-colors",
                            active ? "text-2xl text-white" : "text-zinc-500 hover:text-white",
                          )}
                        >
                          <span>{t(`nav.${item.key}`)}</span>
                          <Zap
                            className={cn(
                              "h-6 w-6 text-cyan-500",
                              active ? "scale-125 opacity-100" : "opacity-0 group-hover:opacity-100",
                            )}
                          />
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>

                <div className="mt-auto shrink-0 space-y-6 pb-12">
                  <div className="h-px w-full bg-white/5" />
                  <SignedOut>
                    <div className="flex flex-col gap-4">
                      <SignInLink
                        onNavigate={() => setIsOpen(false)}
                        className="w-full py-4 text-center text-xs font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white"
                      >
                        {t("auth.signIn")}
                      </SignInLink>
                      <SignInLink
                        route="/sign-up"
                        onNavigate={() => setIsOpen(false)}
                        className="w-full rounded-2xl bg-white py-5 text-center text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-500 hover:text-white"
                      >
                        {t("auth.joinNow")}
                      </SignInLink>
                    </div>
                  </SignedOut>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </nav>
  );
}
