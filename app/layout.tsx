import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import NextTopLoader from "nextjs-toploader";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PostAuthRedirect from "@/components/auth/post-auth-redirect";
import { MediaDetailsProvider } from "@/components/media/media-details-provider";
import Toaster from "@/components/providers/toaster";
import { localeMeta, type Locale } from "@/i18n/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  // A11Y: removed `maximumScale: 1`, which blocked pinch-zoom.
};

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("metadata");

  return {
    metadataBase: new URL(DOMAIN),
    title: { default: t("defaultTitle"), template: "%s | LuminaFlix" },
    description: t("description"),
    robots: { index: true, follow: true },
    keywords: ["streaming", "movies", "tv shows", "anime", "k-drama", "luminaflix"],
    authors: [{ name: "Tooj Rtn" }],
    creator: "Tooj Rtn",
    publisher: "LuminaFlix",
    openGraph: {
      type: "website",
      locale: localeMeta[locale].og,
      alternateLocale: Object.values(localeMeta)
        .map((m) => m.og)
        .filter((og) => og !== localeMeta[locale].og),
      url: DOMAIN,
      siteName: "LuminaFlix",
      title: "LuminaFlix",
      description: t("ogDescription"),
      images: [{ url: "/og-image.png", width: 1024, height: 1024, alt: t("ogAlt") }],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as Locale;

  return (
    <ClerkProvider
      localization={locale === "fr" ? frFR : undefined}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang={locale} className="dark">
        <body className={`${geistSans.variable} ${geistMono.variable} bg-black antialiased`}>
          <NextIntlClientProvider>
            <NextTopLoader
              color="#06b6d4"
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl
              showSpinner={false}
              easing="ease"
              speed={200}
              shadow="0 0 10px #06b6d4, 0 0 5px #06b6d4"
            />
            <MediaDetailsProvider>
              <Navbar />
              {children}
              <Footer />
            </MediaDetailsProvider>
            <PostAuthRedirect />
            <Toaster />
            <Analytics />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
