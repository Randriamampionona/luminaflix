import { Facebook, Github, Instagram, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { Container } from "@/components/layout/container";
import { FOOTER_SECTIONS, SOCIAL_LINKS } from "@/lib/navigation";
import { Logo } from "./navbar";

const SOCIAL_ICONS = { facebook: Facebook, twitter: Twitter, instagram: Instagram, youtube: Youtube, github: Github };

export default async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();
  const socials = SOCIAL_LINKS.filter((social) => social.href);

  return (
    <footer className="mt-auto border-t border-white/5 bg-zinc-950 pb-12 pt-20 sm:pt-24">
      {/* UI STANDARD: footer shares the page container (was max-w-450 px-16). */}
      <Container>
        <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 space-y-6">
            <Logo size="sm" />
            <p className="max-w-sm text-sm font-medium leading-relaxed text-zinc-500">{t("tagline")}</p>
            <div className="flex flex-wrap items-center gap-4">
              <LanguageSwitcher align="start" />
              {socials.map(({ key, href }) => {
                const Icon = SOCIAL_ICONS[key];
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(`social.${key}`)}
                    className="rounded-full border border-white/5 bg-zinc-900 p-2.5 text-zinc-500 transition-colors hover:border-cyan-500/30 hover:text-cyan-500"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.key} aria-labelledby={`footer-${section.key}`} className="space-y-6">
              <h2 id={`footer-${section.key}`} className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                {t(`sections.${section.key}`)}
              </h2>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      className="text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-white"
                    >
                      {t(`links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-10 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t("copyright", { year })}</p>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {t("by")}
              <a
                href="https://tooj-rtn.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-500 hover:underline"
              >
                Tooj Rtn
              </a>
            </p>
          </div>

          <p className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/50 px-4 py-2">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">{t("status")}</span>
          </p>
        </div>

        <p className="mt-8 text-center text-[10px] text-zinc-700 md:text-left">{t("tmdb")}</p>
      </Container>
    </footer>
  );
}
