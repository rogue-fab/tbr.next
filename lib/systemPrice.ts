// lib/systemPrice.ts
//
// SINGLE SOURCE OF TRUTH for the "system price" calculation. Consolidates four
// former copies (scoring.ts, proCons.ts, app/page.tsx, app/compare/page.tsx).
//
// System price = frame + die + hydraulic + stand (min preferred), falling back
// to the catalog price string when no component prices exist.

/**
 * Parse a money-ish value. Normalizes unicode dashes (en/em/minus) to ASCII
 * hyphen first, so a range string like "$1,800 – $2,500" yields its first value
 * (1800) instead of the concatenated "18002500" (~$18M). Returns null if unparseable.
 */
export function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(
    String(v).replace(/[‒-―−]/g, "-").replace(/[^0-9.+-]/g, ""),
  );
  return Number.isFinite(n) ? n : null;
}

export type SystemPrice = {
  /** Display: lowest system total, or the catalog price fallback. null if unknown. */
  min: number | null;
  /** Display: highest system total. null when no max components exist. */
  max: number | null;
  /** Scoring: entry price — min system total, else max system total, else catalog price. */
  entry: number | undefined;
};

export function computeSystemPrice(p: any): SystemPrice {
  const frameMin = parseMoney(p?.framePriceMin);
  const dieMin = parseMoney(p?.diePriceMin);
  const hydraulicMin = parseMoney(p?.hydraulicPriceMin);
  const standMin = parseMoney(p?.standPriceMin);

  const frameMax = parseMoney(p?.framePriceMax);
  const dieMax = parseMoney(p?.diePriceMax);
  const hydraulicMax = parseMoney(p?.hydraulicPriceMax);
  const standMax = parseMoney(p?.standPriceMax);

  const hasMin =
    frameMin !== null || dieMin !== null || hydraulicMin !== null || standMin !== null;
  const hasMax =
    frameMax !== null || dieMax !== null || hydraulicMax !== null || standMax !== null;

  const minSum = hasMin
    ? (frameMin ?? 0) + (dieMin ?? 0) + (hydraulicMin ?? 0) + (standMin ?? 0)
    : null;
  const maxSum = hasMax
    ? (frameMax ?? 0) + (dieMax ?? 0) + (hydraulicMax ?? 0) + (standMax ?? 0)
    : null;

  const priceFallback = parseMoney(p?.price);

  const min = minSum ?? priceFallback;
  const max = maxSum;

  let entry: number | undefined;
  if (minSum !== null && minSum > 0) entry = minSum;
  else if (maxSum !== null && maxSum > 0) entry = maxSum;
  else if (priceFallback !== null && priceFallback > 0) entry = priceFallback;

  return { min, max, entry };
}
