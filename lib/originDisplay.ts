// lib/originDisplay.ts
//
// Shared, presentation-only mapping of the internal `country` origin buckets to
// what the reader actually sees. Goals:
//   - "Made in USA" is the prominent claim for any USA-origin bucket.
//   - The FTC qualification jargon ("FTC-unqualified" / "qualified claim") is
//     kept only as a tiny secondary note (meaningless to most readers).
//   - The "Assembled in USA" phrasing is never emitted anywhere.
//
// This does NOT change scoring or the stored data — Category 11 (USA
// Manufacturing) and Category 12 (Origin Transparency) still differentiate on
// the underlying tiers.

export type OriginDisplay = {
  /** Prominent label, e.g. "Made in USA", "Imported", or "—". */
  primary: string;
  /** Tiny secondary qualifier, e.g. "FTC-unqualified" or "qualified claim". */
  qualifier?: string;
  /** True for any USA-origin claim (used for emphasis styling). */
  usa: boolean;
};

export function classifyOrigin(country?: string | null): OriginDisplay {
  const s = (country ?? "").toLowerCase().trim();
  if (!s) return { primary: "—", usa: false };

  const nonUsa =
    s.includes("non-usa") ||
    s.includes("no usa") ||
    s.includes("imported") ||
    s.includes("international");
  const usa = !nonUsa && (s.includes("usa") || s.includes("united states"));

  if (usa) {
    let qualifier: string | undefined;
    // NOTE: "unqualified" contains "qualified", so test it first.
    if (s.includes("unqualified")) qualifier = "FTC-unqualified";
    else if (s.includes("qualified") || s.includes("assembled")) qualifier = "qualified claim";
    return { primary: "Made in USA", qualifier, usa: true };
  }

  return { primary: "Imported", usa: false };
}

/** Single-line label (e.g. for the detail spec table) — never contains "Assembled in USA". */
export function formatOriginLabel(country?: string | null): string {
  const { primary, qualifier } = classifyOrigin(country);
  return qualifier ? `${primary} (${qualifier})` : primary;
}
