import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { SCORING_CATEGORIES, TOTAL_POINTS } from "../../lib/scoring";
import { getAllTubeBendersWithOverlay } from "../../lib/catalogOverlay";

// If ExactRules() renders an explicit mapping for a category, we must NOT also
// render the generic "Tier mapping" box beneath it (it becomes duplicate/bloated).
const CATS_WITH_EXACT_RULES = new Set<string>([
  "easeOfUseSetup",
  "usaManufacturingDisclosure",
  "originTransparency",
  "singleSourceSystem",
]);

export const metadata: Metadata = {
  title: "Tube Bender Scoring Methodology",
  description:
    "See the full scoring methodology used to rate tube benders on TubeBenderReviews, including exact rules and current dataset maxima.",
  openGraph: {
    title: "Tube Bender Scoring Methodology",
    description:
      "Transparent scoring system for tube bender comparisons, with exact rules and current dataset maxima.",
  },
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

type Leader = { value: number; label: string };
function pickLeader(best: Leader | null, value: number, label: string): Leader {
  if (!best) return { value, label };
  if (value > best.value) return { value, label };
  return best;
}

function titleOf(p: any): string {
  const brand = String(p?.brand ?? "").trim();
  const model = String(p?.model ?? "").trim();
  const name = String(p?.name ?? "").trim();
  const bits = [brand, model].filter(Boolean).join(" ").trim();
  return bits || name || String(p?.id ?? "Unknown model");
}

function MethodBadge({ method }: { method: string }) {
  const label =
    method === "tier"
      ? "Tier-based"
      : method === "scaled"
      ? "Scaled (fixed thresholds)"
      : method === "binary"
      ? "Binary"
      : "Brand-based";
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
      Method: {label}
    </span>
  );
}

function ExactRules({ catKey }: { catKey: string }) {
  // This page must be human-reproducible and FTC-safe:
  // - Describe EXACT tiers / mappings that match scoringEngine.ts today
  // - Never imply we "infer" missing data: missing/unknown => 0 for that sub-score/category where applicable
  switch (catKey) {
    case "easeOfUseSetup":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            portability (0–3) plus an evidence checklist (0–7). No brand-based scoring. No subjective tiers.
          </p>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">A) Portability (0–3)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-mono">fixed</span> → 0</li>
              <li><span className="font-mono">portable</span> → 1</li>
              <li><span className="font-mono">portable_with_rolling_option</span> → 2</li>
              <li><span className="font-mono">rolling_standard</span> → 3</li>
            </ul>
            <div className="mt-3 font-semibold text-gray-900">B) Evidence checklist (1 pt each; 7 max)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Manual available (downloadable or explicitly included)</li>
              <li>On-machine operation instructions/tips shown/promised</li>
              <li>Built-in bend angle reference (scale/reference; loose magnetic cube does not count)</li>
              <li>Angle stop available (mechanical or equivalent)</li>
              <li>Rotation aid: chuck/indexer or clamp-on analog/digital (magnet-only scores 0; fails on non-ferrous)</li>
              <li>Quick die change engineered aid documented</li>
              <li>Official manufacturer YouTube instructional content for this exact model (top-10 YT results for BRAND+MODEL)</li>
            </ul>
            <div className="mt-2 text-gray-600">If it's not publicly documented or shown, it scores 0. No guessing.</div>
            <div className="mt-2 text-gray-600">Final = min(10, portability + evidence checklist).</div>
          </div>
        </>
      );

    case "usaManufacturingDisclosure":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            a disclosure-based tier (0–5) based solely on the manufacturer's own published claims. This is{" "}
            <span className="font-semibold">not</span> a legal opinion and not an FTC compliance ruling.
          </p>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Tier meaning (points = tier number)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">5</span> → FTC-unqualified "Made in USA" claim (explicitly stated by manufacturer).</li>
              <li><span className="font-semibold">4</span> → Strong USA build claim (frame + dies clearly USA; hydraulics mostly/partially USA per disclosure).</li>
              <li><span className="font-semibold">3</span> → "Made/Assembled in USA" claim with substantial USA content described (e.g., majority USA parts/materials stated or clearly implied in published copy).</li>
              <li><span className="font-semibold">1</span> → USA assembly claimed but imported parts/content not described well enough to justify a higher tier.</li>
              <li><span className="font-semibold">0</span> → Imported, no meaningful USA claim, or only vague USA-flavored language.</li>
            </ul>
            <div className="mt-2 text-gray-600">
              Missing/unclear disclosure → score conservatively at the lower tier. We do not guess.
            </div>
          </div>
        </>
      );

    case "originTransparency":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            how clearly the manufacturer documents the origin of major components. This scores documentation quality only; it does not reward or penalize any country.
          </p>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Tier meaning (points = tier number)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">5</span> → Clear documentation of frame, dies, hydraulics, and other major components (with minimal gaps).</li>
              <li><span className="font-semibold">4</span> → Clear origin info for most major components, with only minor gaps.</li>
              <li><span className="font-semibold">3</span> → Partial disclosure (some key components documented, others omitted).</li>
              <li><span className="font-semibold">2</span> → Minimal disclosure (scattered or vague origin language).</li>
              <li><span className="font-semibold">0</span> → No meaningful origin disclosure or conflicting/unclear claims.</li>
            </ul>
          </div>
        </>
      );

    case "singleSourceSystem":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            whether a normal buyer can obtain a complete, fully functional bending system from one primary storefront/manufacturer — specifically:
            frame + dies + the required power/actuation (hydraulics or lever), plus the stand/base if it is required for normal use.
          </p>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Binary mapping (2 max)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">2 points</span> → full system available from one primary source, and the system is sold as a coherent platform under that source (no required "go elsewhere" components).</li>
              <li><span className="font-semibold">0 points</span> → anything else (missing key components, requires sourcing elsewhere, or unclear completeness).</li>
            </ul>
          </div>
        </>
      );

    default:
      return null;
  }
}

function RulesBlock({ catKey, maxima }: { catKey: string; maxima: Record<string, Leader | null> }) {
  // These rules MUST match lib/scoringEngine.ts exactly. Presentation only.
  switch (catKey) {
    case "valueForMoney":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> the entry-level starter system price (<span className="font-mono">entryPrice</span>) derived from the lowest documented prices for frame + dies + power + stand. If component pricing is missing, we fall back to any known catalog price.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Exact point tiers (20 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>≤ $1500 → 20</li>
              <li>≤ $2000 → 18</li>
              <li>≤ $3000 → 15</li>
              <li>≤ $4500 → 12</li>
              <li>≤ $6500 → 9</li>
              <li>&gt; $6500 → 7</li>
            </ul>
            <p className="mt-2 text-[11px] text-gray-600">
              If <span className="font-mono">entryPrice</span> is missing, the engine uses a legacy price-band heuristic (kept for backward compatibility).
            </p>
          </div>
          {maxima.entryPriceMinMax ? (
            <p className="text-[11px] text-gray-600">
              <span className="font-semibold">Current dataset:</span> entryPrice ranges from{" "}
              <span className="font-semibold">${maxima.entryPriceMinMax.value.toFixed(0)}</span>{" "}
              (see note below for how computed).
            </p>
          ) : null}
        </div>
      );
    case "maxDiameterRadius":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score today:</span> maximum published round-tube OD capacity (<span className="font-mono">maxCapacity</span>). CLR is not yet in the math because CLR data is not standardized across all models.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Exact point tiers (10 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>≥ 2.5 → 10</li>
              <li>≥ 2.375 → 9</li>
              <li>≥ 2.25 → 8</li>
              <li>≥ 2.0 → 7</li>
              <li>≥ 1.75 → 5</li>
              <li>≥ 1.5 → 3</li>
              <li>&gt; 0 → 2</li>
              <li>missing/unknown → 0</li>
            </ul>
          </div>
          {maxima.maxCapacity ? (
            <p className="text-[11px] text-gray-600">
              <span className="font-semibold">Current dataset max OD:</span>{" "}
              <span className="font-semibold">{maxima.maxCapacity.value.toFixed(3)}</span> in ({maxima.maxCapacity.label})
            </p>
          ) : (
            <p className="text-[11px] text-gray-600">
              <span className="font-semibold">Current dataset max OD:</span> unavailable (no parseable maxCapacity values in the dataset).
            </p>
          )}
        </div>
      );
    case "bendAngleCapability":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> maximum published bend angle (<span className="font-mono">maxBendAngle</span>/<span className="font-mono">bendAngle</span>). Missing angle scores 0.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Exact point tiers (9 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>≥ 195° → 9</li>
              <li>180–194° → 7</li>
              <li>120–179° → 4</li>
              <li>&lt; 120° → 2</li>
              <li>missing/unknown → 0</li>
            </ul>
          </div>
          {maxima.maxBendAngle ? (
            <p className="text-[11px] text-gray-600">
              <span className="font-semibold">Current dataset max angle:</span>{" "}
              <span className="font-semibold">{maxima.maxBendAngle.value.toFixed(0)}°</span> ({maxima.maxBendAngle.label})
            </p>
          ) : null}
        </div>
      );
    case "wallThicknessCapability":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> published max wall thickness for <span className="font-semibold">1.75&quot; OD DOM</span> (<span className="font-mono">wallThicknessCapacity</span>). If this is not published, the category scores <span className="font-semibold">0</span> — we do not guess.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Thickness points (0–6)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>≥ 0.156&quot; → 6</li>
              <li>≥ 0.120&quot; → 5</li>
              <li>≥ 0.095&quot; → 4</li>
              <li>&gt; 0 → 3</li>
              <li>missing/unknown → 0 (entire category becomes 0)</li>
            </ul>
            <div className="font-semibold text-gray-900 mt-3 mb-1">Material coverage points (0–3)</div>
            <p className="text-[11px] text-gray-600">
              If the manufacturer publishes a material list, we score it by mapping documented materials into weighted buckets (mild steel, 4130, stainless, aluminum, titanium, copper/brass/bronze, other). If no list is published, this sub-score is 0.
            </p>
          </div>
          {maxima.maxWallAt175 ? (
            <p className="text-[11px] text-gray-600">
              <span className="font-semibold">Current dataset max wall @ 1.75&quot;:</span>{" "}
              <span className="font-semibold">{maxima.maxWallAt175.value.toFixed(3)}&quot;</span> ({maxima.maxWallAt175.label})
            </p>
          ) : null}
        </div>
      );
    case "dieSelectionShapes":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> documented die family coverage. One point per bucket, max 8 points. No documentation → 0 for that bucket.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Buckets (1 pt each, 8 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Round tube</li>
              <li>Pipe</li>
              <li>Square tube</li>
              <li>EMT</li>
              <li>Metric round</li>
              <li>Metric square/rectangular</li>
              <li>Plastic/urethane pressure dies</li>
              <li>Other documented shapes (e.g. hex, specialty profiles)</li>
            </ul>
          </div>
        </div>
      );
    case "yearsInBusiness":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> stated years in business when available; otherwise a conservative legacy brand heuristic. This category is intentionally low weight.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Numeric tiers (3 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>≥ 25 years → 3</li>
              <li>≥ 10 years → 2</li>
              <li>&gt; 0 years → 1</li>
              <li>missing/unknown → falls back to a conservative brand heuristic</li>
            </ul>
          </div>
        </div>
      );
    case "upgradePathModularity":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> factory-documented upgrade flags. Each documented upgrade is worth 1 point (8 max). Missing/unknown → 0 for that flag.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Flags (1 pt each, 8 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Power upgrade path</li>
              <li>Length stop</li>
              <li>Rotation indexing</li>
              <li>Angle measurement</li>
              <li>Auto-stop</li>
              <li>Thick-wall upgrade</li>
              <li>Thin-wall upgrade</li>
              <li>Wiper die support</li>
            </ul>
          </div>
        </div>
      );
    case "mandrelCompatibility":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> the manufacturer's documented mandrel capability for this frame. If not documented, it scores 0. No guessing.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Exact mapping (4 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-mono">mandrel</span> = <span className="font-mono">"available"</span> or <span className="font-mono">"bronze"</span> → 4</li>
              <li><span className="font-mono">mandrel</span> = <span className="font-mono">"economy"</span> → 2</li>
              <li>anything else / missing → 0</li>
            </ul>
            <p className="mt-2 text-[11px] text-gray-600">
              "Economy" means non-bronze mandrels (plastic/aluminum/steel). "Available/bronze" means a full bronze or equivalent factory-supported system.
            </p>
          </div>
        </div>
      );
    case "sBendCapability":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> true/false for true S-bend capability. If it's not documented or not explicitly verified, it scores 0.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Binary (3 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-mono">sBendCapability</span> true → 3</li>
              <li>false / missing → 0</li>
            </ul>
            <p className="mt-2 text-[11px] text-gray-600">
              Definition: two opposite-direction bends with ≤0.125&quot; straight (tangent) between them. Marketing photos with inches of straight do not qualify.
            </p>
          </div>
        </div>
      );
    case "usaManufacturingDisclosure":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> a disclosure-based tier (0–5) based solely on the manufacturer's published claims. This is not a legal opinion and not an FTC compliance ruling.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Tier mapping (5 max)</div>
            <p className="text-[11px] text-gray-600">
              Points equal the tier number (0–5). The specific meaning of each tier is defined by our documentation standard (claims about frames/dies/hydraulics/assembly).
            </p>
          </div>
        </div>
      );
    case "originTransparency":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> how clearly the manufacturer documents component origin (tier 0–5). This scores documentation quality only.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Tier mapping (5 max)</div>
            <p className="text-[11px] text-gray-600">
              Points equal the tier number (0–5).
            </p>
          </div>
        </div>
      );
    case "singleSourceSystem":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> whether a buyer can get a complete, functional system from one primary storefront/manufacturer. Partial systems score 0.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Binary mapping (2 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>tier == 2 → 2 points</li>
              <li>anything else → 0 points</li>
            </ul>
          </div>
        </div>
      );
    case "warrantySupport":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> published warranty terms only (tier 0–3). We do not score how well a warranty is honored.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Tier mapping (3 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>0 = no meaningful written warranty / sold as-is / not mentioned</li>
              <li>1 = short, limited, or vague coverage</li>
              <li>2 = clear ~1–2 year coverage</li>
              <li>3 = clear multi-year or lifetime frame/structural coverage</li>
            </ul>
          </div>
        </div>
      );
    default:
      return (
        <p className="text-xs text-gray-600">
          This category's rules are defined in the scoring engine. If you see this message, the /scoring page needs a mapping update for <span className="font-mono">{catKey}</span>.
        </p>
      );
  }
}

export default async function ScoringPage() {
  // Pull the same merged dataset public pages use so maxima auto-update.
  const all = (await getAllTubeBendersWithOverlay()) as any[];

  let maxCapacity: Leader | null = null;
  let maxBendAngle: Leader | null = null;
  let maxWallAt175: Leader | null = null;
  let minEntry: Leader | null = null;
  let maxEntry: Leader | null = null;

  for (const p of all) {
    const label = titleOf(p);

    const cap = toNum(p?.maxCapacity ?? p?.capacity);
    if (cap != null && cap > 0) maxCapacity = pickLeader(maxCapacity, cap, label);

    const ang = toNum(p?.maxBendAngle ?? p?.bendAngle);
    if (ang != null && ang > 0) maxBendAngle = pickLeader(maxBendAngle, ang, label);

    const wall = toNum(p?.wallThicknessCapacity ?? p?.maxWallAt175 ?? p?.maxWall175Dom);
    if (wall != null && wall > 0) maxWallAt175 = pickLeader(maxWallAt175, wall, label);

    // entryPrice is derived inside getProductScore; we don't recompute it here to avoid drift.
    // We still compute a *best-effort* price range from component mins/maxes for transparency.
    const frameMin = toNum(p?.framePriceMin);
    const dieMin = toNum(p?.diePriceMin);
    const hydMin = toNum(p?.hydraulicPriceMin);
    const standMin = toNum(p?.standPriceMin);
    const minSys = (frameMin ?? 0) + (dieMin ?? 0) + (hydMin ?? 0) + (standMin ?? 0);
    if (minSys > 0) {
      // min leader is tracked by negative value trick (keep it simple)
      if (!minEntry || minSys < minEntry.value) minEntry = { value: minSys, label };
      maxEntry = pickLeader(maxEntry, minSys, label);
    }
  }

  const maxima = {
    maxCapacity,
    maxBendAngle,
    maxWallAt175,
    entryPriceMinMax: maxEntry, // used as a "seen range" hint; details explained in the UI
  } as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            Tube Bender Scoring Methodology
          </h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-600">
            Exact, unambiguous rules for how scores are calculated. When data is not published by the manufacturer, we score that category as <span className="font-semibold">0</span> rather than guessing.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {/* Scoring overview */}
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Scoring Overview
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Our scoring system evaluates tube benders across measurable, objective criteria.
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total Points
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {TOTAL_POINTS}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Each bender receives a score out of 100 points across {SCORING_CATEGORIES.length} categories.
              </p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Categories
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {SCORING_CATEGORIES.length}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Covering value, capacity, manufacturing, upgrade path, and
                advanced capability.
              </p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Scoring methods
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-gray-700">
                  Fixed-threshold tiers
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-gray-700">
                  Binary scoring
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-gray-700">
                  Tier-based scoring
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Current dataset maxima (auto-updating) */}
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Current dataset maxima (auto-updating)
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            These values are computed from the current catalog + admin overlay data. If a new model is added with higher capacity/angle/wall, these numbers update automatically.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-xs text-gray-700">
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="font-semibold text-gray-900">Max OD capacity (published)</div>
              <div className="mt-1">
                {maxCapacity ? (
                  <>
                    <span className="font-semibold">{maxCapacity.value.toFixed(3)} in</span>
                    <div className="text-[11px] text-gray-600 mt-1">{maxCapacity.label}</div>
                  </>
                ) : (
                  <span className="text-gray-600">No parseable maxCapacity values</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="font-semibold text-gray-900">Max bend angle (published)</div>
              <div className="mt-1">
                {maxBendAngle ? (
                  <>
                    <span className="font-semibold">{maxBendAngle.value.toFixed(0)}°</span>
                    <div className="text-[11px] text-gray-600 mt-1">{maxBendAngle.label}</div>
                  </>
                ) : (
                  <span className="text-gray-600">No parseable bend angles</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="font-semibold text-gray-900">Max wall @ 1.75&quot; DOM (published)</div>
              <div className="mt-1">
                {maxWallAt175 ? (
                  <>
                    <span className="font-semibold">{maxWallAt175.value.toFixed(3)}&quot;</span>
                    <div className="text-[11px] text-gray-600 mt-1">{maxWallAt175.label}</div>
                  </>
                ) : (
                  <span className="text-gray-600">No parseable wall thickness values</span>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-gray-600">
            Note: the scoring engine uses fixed thresholds (not relative-to-max curves). The maxima are shown for transparency and update automatically with the dataset.
          </p>
        </section>

        {/* Detailed categories */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Detailed Category Scoring
          </h2>

          <div className="space-y-6">
            {SCORING_CATEGORIES.map((cat) => {
              const catKey = cat.key;
              const skipGenericTierBox = CATS_WITH_EXACT_RULES.has(catKey);

              return (
                <article
                  key={cat.key}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm"
                >
                <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {cat.index}. {cat.name}{" "}
                      <span className="font-normal text-gray-500">
                        ({cat.maxPoints} points)
                      </span>
                    </h3>
                    <p className="mt-1 text-xs text-gray-600">
                      {cat.tagline}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MethodBadge method={cat.method} />
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      Max {cat.maxPoints} pts
                    </span>
                  </div>
                </header>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="text-xs text-gray-600">
                      Method:{" "}
                      {cat.key === "easeOfUseSetup"
                        ? "Checklist + portability (evidence-only)"
                        : cat.method === "tier"
                        ? "Tier-based"
                        : cat.method === "scaled"
                        ? "Scaled (fixed thresholds)"
                        : cat.method === "binary"
                        ? "Binary"
                        : "Brand-based"}
                    </div>

                    {/* Exact rules (FTC-safe, reproducible) */}
                    <div className="mt-4">
                      <ExactRules catKey={catKey} />
                    </div>

                    {/* Generic helper mapping
                        IMPORTANT: Do NOT show this when ExactRules already prints the mapping,
                        otherwise the user sees two grey boxes saying the same thing. */}
                    {cat.method === "tier" && !skipGenericTierBox ? (
                      <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
                        <div className="font-semibold text-gray-900">Tier mapping</div>
                        <div className="mt-1 text-gray-600">
                          Points equal the tier number (0–{cat.maxPoints}).
                        </div>
                      </div>
                    ) : null}
                    {/* RulesBlock is a fallback helper. If ExactRules already prints the full mapping,
                        do not render RulesBlock (it can add stray "rules are defined..." text and/or
                        duplicate grey boxes). */}
                    {!skipGenericTierBox ? (
                      <RulesBlock catKey={cat.key} maxima={maxima as any} />
                    ) : null}
                  </div>
                  <div className="space-y-2 text-xs text-gray-600">
                    <p className="font-medium text-gray-900">Data sources & verification</p>
                    <ul className="space-y-1 list-disc pl-4">
                      <li>Manufacturer technical specifications, capacity charts, and manuals</li>
                      <li>Official product pages and documentation PDFs</li>
                      <li>Documented compatibility lists (dies/materials/upgrades)</li>
                      <li>If it's not published/verified, that feature scores 0 for that category</li>
                    </ul>
                    <p className="text-[11px] text-gray-600">
                      Looking for the per-product math? Open any review and expand{" "}
                      <span className="font-semibold">Score math (diagnostic)</span>.
                    </p>
                    <Link className="underline text-[11px]" href="/reviews">
                      Browse reviews
                    </Link>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        </section>

        {/* Transparency block */}
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Transparency & Verification
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            All scoring is based on publicly available manufacturer documentation and verifiable claims. If a capability is not published or cannot be verified, it scores <span className="font-semibold">0</span> for that category rather than relying on assumptions.
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-2 text-xs text-gray-600">
            <div>
              <p className="font-medium text-gray-900 mb-1">Data sources</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Manufacturer technical specs and capacity charts</li>
                <li>Product manuals and official documentation</li>
                <li>Company founding dates and history</li>
                <li>Clarification from support and sales teams</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">
                Scoring verification
              </p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Cross-checks across multiple official sources</li>
                <li>
                  Conservative scoring when data is incomplete or ambiguous (0 points rather than guessing)
                </li>
                <li>
                  Individual product pages expose per-category breakdowns so you can inspect each score.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
