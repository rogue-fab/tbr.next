import type { MetadataRoute } from "next";
import { getAllTubeBendersWithOverlay } from "../lib/catalogOverlay";
import { slugForProduct } from "../lib/ids";

// Rebuild on demand so newly-completed model reviews appear as data is entered.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.tubebenderreviews.com"
  ).replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBase();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/scoring`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];

  // Only include reviews for ACTIVE (fully-complete) models, so we never point
  // search engines at thin, zero-score placeholder pages while data is entered.
  let reviewPages: MetadataRoute.Sitemap = [];
  try {
    const products = await getAllTubeBendersWithOverlay();
    reviewPages = products
      .filter((p) => (p as any).active === true)
      .map((p) => ({
        url: `${base}/reviews/${slugForProduct(p as any)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    // If the DB is unreachable, still return the static pages.
  }

  return [...staticPages, ...reviewPages];
}
