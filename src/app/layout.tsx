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
const SITE_TITLE = "AXIOM — Open-Source Math Simulator";
const SITE_DESCRIPTION =
  "AXIOM is a free, open-source mathematics simulator with 10 interactive workspaces: graphing calculator, Mandelbrot fractals, Conway's Game of Life, quantum circuits, topology, 4D geometry, dynamical systems and more.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — AXIOM",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "axiom simulator",
    "axiom math",
    "axiom mathematics",
    "math simulator",
    "mathematics simulator",
    "open source math",
    "graphing calculator online",
    "mandelbrot fractal explorer",
    "game of life simulator",
    "conway game of life",
    "quantum circuit simulator",
    "topology explorer",
    "dynamical systems simulator",
    "4D geometry",
    "interactive mathematics",
    "math playground",
    "free math tools",
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
    google: "9ac72867bfeeb039",
    other: {
      "msvalidate.01": "3DC54E96FB2125ACE316E098C9DAA5DF",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9f5",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AXIOM",
  alternateName: ["AXIOM Simulator", "Axiom Math Simulator", "axiom-simulator"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  applicationSubCategory: "Mathematics",
  operatingSystem: "Web Browser",
  browserRequirements: "Requires JavaScript. WebGL recommended.",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  author: {
    "@type": "Person",
    name: "Max-arango",
    url: "https://github.com/Max-arango",
  },
  creator: {
    "@type": "Person",
    name: "Max-arango",
    url: "https://github.com/Max-arango",
  },
  codeRepository: "https://github.com/Max-arango/Axiom-Simulator",
  license: "https://opensource.org/licenses/MIT",
  keywords: "axiom simulator, math simulator, graphing calculator, mandelbrot fractal, game of life, quantum circuit simulator, topology, 4D geometry, dynamical systems, open source mathematics",
  featureList: [
    "2D and 3D graphing calculator",
    "GPU-accelerated Mandelbrot and Julia set fractals",
    "Bloch sphere qubit visualization",
    "Quantum circuit simulator",
    "4D geometry and tesseract projection",
    "Topology and homeomorphism explorer",
    "Dynamical systems and phase portraits",
    "Conway's Game of Life with pattern library",
    "Mathematical structure inspector",
    "Reproducible math notebook",
  ],
  screenshot: `${SITE_URL}/opengraph-image`,
  softwareVersion: "0.2.1",
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
