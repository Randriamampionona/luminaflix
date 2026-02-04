import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
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
  // OpenGraph for social media previews
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
  // Modern mobile browser styling
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Navbar />
          {children}
          <Analytics />
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
