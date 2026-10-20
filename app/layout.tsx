import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { shadcn } from "@clerk/themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import NextTopLoader from "nextjs-toploader";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PostAuthRedirect from "@/components/auth/post-auth-redirect";
import ThemeProvider from "@/components/providers/theme-provider";
import { MediaDetailsProvider } from "@/components/media/media-details-provider";
import Toaster from "@/components/providers/toaster";
import FcmPermissionModal from "@/components/fcm-permission-modal";
import AuthPromptModal from "@/components/auth-prompt-modal";
import LiveVisitorChat from "@/components/live-visitor-chat";
import AnalyticsTracker from "@/components/analytics/analytics-tracker";
import OfflineGuard from "@/components/offline-guard";
import PWAInstallModal from "@/components/pwa/pwa-install-modal";
import ServiceWorkerRegistrar from "@/components/pwa/service-worker-registrar";
import { PWA_CAPTURE_SCRIPT } from "@/hooks/use-pwa-install";
import { localeMeta, type Locale } from "@/i18n/config";
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  // Browser UI colour follows the OS scheme (the page follows the user's choice).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#020202" },
  ],
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
    // Installable on iPhone / iPad (also required there for push notifications).
    appleWebApp: { capable: true, title: "LuminaFlix", statusBarStyle: "black-translucent" },
    icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }] },
    // Next only emits the newer `mobile-web-app-capable`; older iOS versions read this one.
    other: { "apple-mobile-web-app-capable": "yes" },
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
      // Clerk reads the same CSS tokens as the app, so it follows light/dark.
      appearance={{
        baseTheme: shadcn,
        variables: { colorPrimary: "#06b6d4", colorPrimaryForeground: "#000000", borderRadius: "0.75rem" },
      }}
    >
      {/* No hard-coded "dark": next-themes sets the class before first paint. */}
      <html lang={locale} suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} bg-background antialiased`}>
          {/* Catches the browser's install prompt before React loads (see hooks/use-pwa-install.ts). */}
          <script dangerouslySetInnerHTML={{ __html: PWA_CAPTURE_SCRIPT }} />
          <ThemeProvider>
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
              <FcmPermissionModal />
              {/* Signed-out visitors only: sign-in invitation 10 min into the visit, then +5 min per "Maybe later". */}
              <AuthPromptModal />
              {/* Admin → visitor live chat: invisible until the admin writes (Realtime Database). */}
              <LiveVisitorChat />
              {/* Page-view tracking → ANALYTICS collection (admin dashboard at /analytics) */}
              <AnalyticsTracker />
              <ServiceWorkerRegistrar />
              <PWAInstallModal />
              <OfflineGuard />
              <Analytics />
            </NextIntlClientProvider>
          </ThemeProvider>
        </body>
      </html>
      <SpeedInsights />
    </ClerkProvider>
  );
}
