import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/* Self-hosted fonts (downloaded from Google Fonts) — deterministic,
   offline-safe, and privacy-friendly. */

const inter = localFont({
  src: "../fonts/inter-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

const instrument = localFont({
  src: [
    {
      path: "../fonts/instrument-serif.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/instrument-serif-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = localFont({
  src: "../fonts/jbmono-var.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-mono-deck",
  display: "swap",
});

const SITE_URL = "https://axiom-simulator.vercel.app";
const SITE_TITLE = "AXIOM — Explore Mathematics";
const SITE_DESCRIPTION =
  "An open-source mathematical exploration environment for graphing, fractals, topology, dynamics, geometry, and more.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — AXIOM",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "mathematics",
    "math visualization",
    "graphing calculator",
    "fractals",
    "mandelbrot",
    "dynamical systems",
    "phase portrait",
    "topology",
    "4D geometry",
    "tesseract",
    "bloch sphere",
    "open source",
  ],
  authors: [{ name: "Max-arango" }],
  creator: "Max-arango",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "AXIOM",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    creator: "@mathematics_simulator",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "science",
  verification: {
    // Add your Google Search Console verification token here once you claim the site:
    // google: "YOUR_VERIFICATION_TOKEN",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9f5",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AXIOM",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Max-arango",
    url: "https://github.com/Max-arango",
  },
  license: "https://opensource.org/licenses/MIT",
  keywords: "mathematics, graphing calculator, fractals, topology, dynamics, game of life, quantum computing, 4D geometry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${instrument.variable} ${jetbrains.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" closeButton />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
