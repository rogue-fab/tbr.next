/**
 * Typed dataset for TubeBenderReviews (placeholder rows; swap with real data later).
 */
export type Bender = {
  brand: string;
  model: string;
  capacity: string; // e.g. 2" x .120 DOM
  price?: number;   // USD
  score?: number;   // 0–100
};

/** Shared list consumed by homepage and /compare. */
export const BENDERS: Bender[] = [
  { brand: "RogueFab", model: "M625", capacity: `2" x .120 DOM`, price: undefined, score: 95 },
  { brand: "Brand A",  model: "AB200", capacity: `1.75" x .095`,  price: 1599,     score: 82 },
  { brand: "Brand B",  model: "BX150", capacity: `1.5" x .083`,   price: 1299,     score: 78 },
];

/**
 * Create a stable slug for matching selections from the URL, e.g.:
 *   brand "RogueFab", model "M625"  -> "roguefab-m625"
 *   brand "Brand B",  model "BX150" -> "brand-b-bx150"
 */
export function toSlug(b: Pick<Bender, "brand" | "model">): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug(b.brand)}-${slug(b.model)}`;
}
