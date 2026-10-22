// lib/originDisplay.ts
//
// Shared, presentation-only mapping of the internal `country` origin buckets to
// what the reader actually sees. Goals:
//   - We only ever report the MAKER'S claim, never our own origin finding.
//   - "Made in USA" is shown only for a flat (tier 2) claim, labelled as the
//     maker's claim. A qualified (tier 1) claim reads "USA claim · qualified",
//     never a bare "Made in USA" — a maker whose own pages disclose imported
//     parts must not get a clean "Made in USA" badge from us.
//   - The "Assembled in USA" phrasing is never emitted anywhere.
//
// This does NOT change scoring or the stored data — Category 11 (USA
// Manufacturing) and Category 12 (Origin Transparency) still differentiate on
// the underlying tiers.

export type OriginDisplay = {
  /** Prominent label, e.g. "Made in USA", "USA claim", or "Origin not disclosed". */
  primary: string;
  /** Tiny secondary qualifier, e.g. "maker's claim" or "qualified". */
  qualifier?: string;
  /** True for any USA-origin claim (used for emphasis styling). */
  usa: boolean;
};

export function classifyOrigin(value?: string | null): OriginDisplay {
  const s = (value ?? "").toLowerCase().trim();
  if (!s) return { primary: "Origin not disclosed", usa: false };

  // Preferred path: the usaClaim tier prefix ("0 – …", "1 – …", "2 – …").
  // Drive the label off the tier NUMBER, not keyword-matching the descriptive
  // text (the tier-1 option text contains the word "imported", which used to
  // mis-flag qualified USA machines as Imported).
  const tier = s.match(/^\s*([0-2])\b/);
  if (tier) {
    const t = Number(tier[1]);
    if (t >= 2) return { primary: "Made in USA", qualifier: "maker's claim", usa: true };
    if (t === 1) return { primary: "USA claim", qualifier: "qualified", usa: true };
    return { primary: "Origin not disclosed", usa: false };
  }

  // Legacy `country` bucket text. We NEVER assert "Imported" — we can't verify
  // where a machine is made, only what the maker publishes. Non-USA / silent =>
  // "Origin not disclosed" (a true, defensible statement about the claim, not
  // an accusation about manufacture).
  const explicitNonUsa = s.includes("non-usa") || s.includes("no usa");
  const claimsUsa =
    !explicitNonUsa &&
    (s.includes("made in usa") ||
      s.includes("assembled in usa") ||
      s.includes("usa claim") ||
      s.includes("united states"));
  if (claimsUsa) {
    const qualified =
      !s.includes("unqualified") && (s.includes("qualified") || s.includes("assembled"));
    return qualified
      ? { primary: "USA claim", qualifier: "qualified", usa: true }
      : { primary: "Made in USA", qualifier: "maker's claim", usa: true };
  }

  return { primary: "Origin not disclosed", usa: false };
}

/** Single-line label (e.g. for the detail spec table) — never contains "Assembled in USA". */
export function formatOriginLabel(country?: string | null): string {
  const { primary, qualifier } = classifyOrigin(country);
  return qualifier ? `${primary} (${qualifier})` : primary;
}
