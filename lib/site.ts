// lib/site.ts
// Canonical absolute site origin, used for sitemap, robots, canonical URLs, and
// JSON-LD. Prefers NEXT_PUBLIC_SITE_URL; falls back to the production domain.
export function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.tubebenderreviews.com"
  ).replace(/\/+$/, "");
}

/** Make a product image path absolute for metadata / structured data. */
export function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  const s = String(pathOrUrl ?? "").trim();
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s)) return s;
  return `${siteBase()}${s.startsWith("/") ? "" : "/"}${s}`;
}
