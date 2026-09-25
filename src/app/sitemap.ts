import type { MetadataRoute } from "next";

const BASE = "https://axiom-simulator.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/simulator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Per-workspace URLs
    ...([
      "calculator",
      "fractal",
      "bloch",
      "quantum",
      "4d",
      "topology",
      "dynamics",
      "dynamics-3d",
      "life",
      "inspector",
      "notebook",
      "docs",
    ] as const).map((seg) => ({
      url: `${BASE}/simulator/${seg}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${BASE}/legal/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/legal/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/legal/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
