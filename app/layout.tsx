import type { Metadata, Viewport } from "next"; // Added Viewport type
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ClerkProvider } from "@clerk/nextjs";
import NextTopLoader from "nextjs-toploader";
import AdsterraSocialBar from "@/components/ads/adsterra-social-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// This is correct - keep this
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(DOMAIN),
  title: {
    default: "LuminaFlix | Stream Your Favorites",
    template: "%s | LuminaFlix",
  },
  description:
    "The ultimate private streaming platform for friends and family.",
  robots: {
    index: true,
    follow: true,
  },
  keywords: ["streaming", "movies", "tv shows", "luminaflix"],
  authors: [{ name: "Tooj Rtn" }],
  creator: "Tooj Rtn",
  publisher: "LuminaFlix",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: DOMAIN,
    siteName: "LuminaFlix",
    title: "LuminaFlix",
    description: "Watch the latest movies and TV shows together.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "LuminaFlix Preview",
      },
    ],
  },
  // themeColor: "#000000", <--- DELETED THIS
  // viewport: "..."      <--- DELETED THIS
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* ADMAVEN */}
          <meta name="admaven-placement" content="Bqjw4pjY4"></meta>
        </head>

        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <NextTopLoader
            color="#06b6d4"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #06b6d4, 0 0 5px #06b6d4"
          />
          <Navbar />
          {children}
          <Analytics />
          <Footer />
          <AdsterraSocialBar />
        </body>
      </html>
    </ClerkProvider>
  );
}
