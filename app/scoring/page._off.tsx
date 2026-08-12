import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { SCORING_CATEGORIES, TOTAL_POINTS } from "../../lib/scoring";
import { getAllTubeBendersWithOverlay } from "../../lib/catalogOverlay";

// If ExactRules() renders an explicit mapping for a category, we must NOT also
// render the generic "Tier mapping" box beneath it (it becomes duplicate/bloated).
const CATS_WITH_EXACT_RULES = new Set<string>([
  "easeOfUseSetup",
  "maxDiameterRadius",
  "bendAngleCapability",
  "usaManufacturingClaim",
  "originDisclosure",
  "singleSourceSystem",
]);
export const dynamic = "force-dynamic";

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

function pickMin(best: Leader | null, value: number, label: string): Leader {
  if (!best) return { value, label };
  if (value < best.value) return { value, label };
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

    case "maxDiameterRadius":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            maximum published round-tube OD capacity (<span className="font-mono">maxCapacity</span>). CLR is display-only (not scored) until CLR data is standardized across all models.
          </p>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Exact point tiers (10 max)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>≥ 2.5 → 10</li>
              <li>≥ 2.375 → 9</li>
              <li>≥ 2.25 → 8</li>
              <li>≥ 2.0 → 7</li>
              <li>≥ 1.75 → 5</li>
              <li>≥ 1.5 → 3</li>
              <li>&gt; 0 → 2</li>
              <li>missing/unknown → 0</li>
            </ul>
            <div className="mt-2 text-gray-600">
              Note: the dataset min/max shown on this page is for transparency only and does not affect scoring.
            </div>
          </div>
        </>
      );

    case "bendAngleCapability":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            maximum published bend angle in degrees. Missing or unpublished angle scores 0.
          </p>
          <div className="mt-2 text-[11px] text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">Notes:</span>
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>This is gross maximum angle. It does not matter how many cycles, strokes, or re-indexing steps are required.</li>
              <li>We only score angles that are explicitly published or otherwise documented for this frame/tooling.</li>
              <li>Missing/unknown angle scores 0. We do not infer angles from photos, reputation, or "typical" expectations.</li>
            </ul>
          </div>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Exact point tiers (9 max)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>≥ 195° → 9</li>
              <li>180–194° → 7</li>
              <li>120–179° → 4</li>
              <li>&lt; 120° → 2</li>
              <li>missing/unknown → 0</li>
            </ul>
            <div className="mt-2 text-gray-600">
              Note: the dataset min/max shown on this page is for transparency only and does not affect scoring.
            </div>
          </div>
        </>
      );

    case "usaManufacturingClaim":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            only the strength of the manufacturer&apos;s own &ldquo;Made in USA&rdquo; claim — the
            words they publish. Not a legal opinion, not a factory audit. The real origin points
            come from Origin Disclosure below.
          </p>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Points</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">2</span> → Flat &ldquo;Made in USA&rdquo; (no fine print, no imported parts disclosed).</li>
              <li><span className="font-semibold">1</span> → Qualified/loose claim (&ldquo;Assembled in USA,&rdquo; &ldquo;American made,&rdquo; or &ldquo;Made in USA&rdquo; with imported parts disclosed).</li>
              <li><span className="font-semibold">0</span> → No USA claim (imported, foreign, or silent).</li>
            </ul>
          </div>
        </>
      );

    case "originDisclosure":
      return (
        <>
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">What we score:</span>{" "}
            how much of the machine&apos;s origin the maker actually documents. Country-neutral —
            disclosing that a part is <em>imported</em> earns the point just the same as disclosing
            it&apos;s USA. Hiding it earns nothing.
          </p>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">One point per documented component (8 max)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">Frame +2</span> · <span className="font-semibold">Dies/tooling +2</span> · <span className="font-semibold">Hydraulic/power unit +2</span></li>
              <li><span className="font-semibold">Pump/motor +1</span> · <span className="font-semibold">Controls/electronics +1</span></li>
            </ul>
            <div className="mt-2 text-gray-600">
              A part the machine doesn&apos;t have (e.g. no hydraulics on a manual bender) isn&apos;t counted against it.
            </div>
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
            <span className="font-semibold">What we score:</span> the documented entry-level starter system price
            derived from the lowest published prices for frame plus dies plus power plus stand. If component pricing
            is missing, we fall back to any published catalog price we have for the machine. This is a price tier,
            not a value guess; capability is scored in the other categories.
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
    case "maxDiameterRadius": {
      const min = maxima?.maxOdMin?.value ?? null;
      const max = maxima?.maxOd?.value ?? null;
      return (
        <>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Exact point tiers (10 max)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>≥ 2.5 → 10</li>
              <li>≥ 2.375 → 9</li>
              <li>≥ 2.25 → 8</li>
              <li>≥ 2.0 → 7</li>
              <li>≥ 1.75 → 5</li>
              <li>≥ 1.5 → 3</li>
              <li>&gt; 0 → 2</li>
              <li>missing/unknown → 0</li>
            </ul>
            <div className="mt-2 text-gray-600">
              Current dataset OD range:{" "}
              {min != null ? `${min.toFixed(3)} in (min)` : "—"} →{" "}
              {max != null ? `${max.toFixed(3)} in (max)` : "—"}
            </div>
          </div>
        </>
      );
    }

    case "bendAngleCapability": {
      const min = maxima?.maxAngleMin?.value ?? null;
      const max = maxima?.maxAngle?.value ?? null;
      return (
        <>
          <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">Exact point tiers (9 max)</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>≥ 195° → 9</li>
              <li>180–194° → 7</li>
              <li>120–179° → 4</li>
              <li>&lt; 120° → 2</li>
              <li>missing/unknown → 0</li>
            </ul>
            <div className="mt-2 text-gray-600">
              Current dataset angle range:{" "}
              {min != null ? `${Math.round(min)}° (min)` : "—"} →{" "}
              {max != null ? `${Math.round(max)}° (max)` : "—"}
            </div>
          </div>
        </>
      );
    }
    case "wallThicknessCapability":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span>
          </p>
          <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
            <li>Published max wall thickness for <span className="font-semibold">1.75&quot; OD DOM</span> (<span className="font-mono">wallThicknessCapacity</span>) → 0–6 pts</li>
            <li>Documented compatible materials list (<span className="font-mono">materials</span>) → 0–4 pts</li>
          </ul>
          <div className="mt-2 text-xs text-gray-700 bg-yellow-50 border border-yellow-200 rounded p-2">
            <span className="font-semibold">Hard rule:</span> If <span className="font-mono">wallThicknessCapacity</span> is missing/unknown, the entire category scores 0 — we do not infer stress capacity from a materials list alone.
          </div>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Thickness points (0–6)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>≥ 0.095&quot; → 1</li>
              <li>≥ 0.120&quot; → 2</li>
              <li>≥ 0.156&quot; → 3</li>
              <li>≥ 0.188&quot; → 4</li>
              <li>≥ 0.250&quot; → 5</li>
              <li>≥ 0.875&quot; → 6 (solid bar; half of 1.75&quot; is 0.875&quot;)</li>
              <li>missing/unknown → 0 (entire category becomes 0)</li>
            </ul>
            <div className="font-semibold text-gray-900 mt-3 mb-1">Materials points (0–4)</div>
            <p className="text-[11px] text-gray-600 mb-2">
              We only count what the manufacturer explicitly documents as compatible for this frame.
            </p>
            <p className="text-[11px] text-gray-600 mb-2">
              <span className="font-semibold">Scored materials list (7 total):</span> Steel, Stainless, 4130, Aluminum, Titanium, Copper, Brass (bronze counts in the Brass bucket).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-600">
              <li>0 = Not listed</li>
              <li>1 = 1+ in list</li>
              <li>2 = 3+ in list</li>
              <li>3 = 5+ in list</li>
              <li>4 = 7+ in list (all covered)</li>
            </ul>
          </div>
          {maxima["wallThicknessCapability"] ? (
            <p className="text-[11px] text-gray-600">
              <span className="font-semibold">Current dataset max wall @ 1.75&quot;:</span>{" "}
              <span className="font-semibold">{maxima["wallThicknessCapability"].value.toFixed(3)}&quot;</span>{" "}
              {maxima["wallThicknessCapability"].value >= 0.875 ? "(solid bar; " : "("}
              {maxima["wallThicknessCapability"].label})
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
            <span className="font-semibold">What we score:</span> published years in business when available. Missing or unknown scores 0. This category is intentionally low weight.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Numeric tiers (3 max)</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>≥ 25 years → 3</li>
              <li>≥ 10 years → 2</li>
              <li>&gt; 0 years → 1</li>
              <li>missing/unknown → 0</li>
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
    case "usaManufacturingClaim":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> only the strength of the maker&apos;s own &ldquo;Made in USA&rdquo; claim. Not a legal opinion or factory audit.
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Points (2 max)</div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-600">
              <li>2 → flat &ldquo;Made in USA&rdquo; (no fine print)</li>
              <li>1 → qualified/loose claim (&ldquo;assembled in USA,&rdquo; etc.)</li>
              <li>0 → no USA claim</li>
            </ul>
          </div>
        </div>
      );
    case "originDisclosure":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">What we score:</span> how much of the machine&apos;s origin the maker documents, component by component. Country-neutral (imported disclosed = USA disclosed).
          </p>
          <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">One point per documented part (8 max)</div>
            <p className="text-[11px] text-gray-600">
              Frame +2, dies/tooling +2, hydraulic/power +2, pump/motor +1, controls +1. Parts the machine lacks aren&apos;t counted against it.
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
    case "easeOfUseSetup":
      return (
        <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
          {/* Intentionally blank: easeOfUseSetup is fully defined by ExactRules above. */}
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

  // Existing maxima build...
  const maxima: Record<string, Leader | null> = {};
  const minima: Record<string, Leader | null> = {};

  // Track dataset min/max for OD and angle for display (human reproducible).
  // Keys match scoring category keys.
  minima["maxDiameterRadius"] = null;
  minima["bendAngleCapability"] = null;

  for (const p of all) {
    const label = titleOf(p);

    // Max OD (Category 3)
    const cap = toNum(p?.maxCapacity ?? p?.capacity);
    if (cap != null && cap > 0) {
      maxima["maxDiameterRadius"] = pickLeader(maxima["maxDiameterRadius"] ?? null, cap, label);
      minima["maxDiameterRadius"] = pickMin(minima["maxDiameterRadius"] ?? null, cap, label);
    }

    // Bend angle (Category 4)
    const ang = toNum(p?.maxBendAngle ?? p?.bendAngle);
    if (ang != null && ang > 0) {
      maxima["bendAngleCapability"] = pickLeader(maxima["bendAngleCapability"] ?? null, ang, label);
      minima["bendAngleCapability"] = pickMin(minima["bendAngleCapability"] ?? null, ang, label);
    }

    const wall = toNum(p?.wallThicknessCapacity ?? p?.maxWallAt175 ?? p?.maxWall175Dom);
    if (wall != null && wall > 0) {
      maxima["wallThicknessCapability"] = pickLeader(maxima["wallThicknessCapability"] ?? null, wall, label);
    }

    // entryPrice is derived inside getProductScore; we don't recompute it here to avoid drift.
    // We still compute a *best-effort* price range from component mins/maxes for transparency.
    const frameMin = toNum(p?.framePriceMin);
    const dieMin = toNum(p?.diePriceMin);
    const hydMin = toNum(p?.hydraulicPriceMin);
    const standMin = toNum(p?.standPriceMin);
    const minSys = (frameMin ?? 0) + (dieMin ?? 0) + (hydMin ?? 0) + (standMin ?? 0);
    if (minSys > 0) {
      // min leader is tracked by negative value trick (keep it simple)
      const minEntry = minima["entryPriceMinMax"] ?? null;
      if (!minEntry || minSys < minEntry.value) minima["entryPriceMinMax"] = { value: minSys, label };
      maxima["entryPriceMinMax"] = pickLeader(maxima["entryPriceMinMax"] ?? null, minSys, label);
    }
  }

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
                {maxima["maxDiameterRadius"] ? (
                  <>
                    <span className="font-semibold">{maxima["maxDiameterRadius"].value.toFixed(3)} in</span>
                    <div className="text-[11px] text-gray-600 mt-1">{maxima["maxDiameterRadius"].label}</div>
                  </>
                ) : (
                  <span className="text-gray-600">No parseable maxCapacity values</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="font-semibold text-gray-900">Max bend angle (published)</div>
              <div className="mt-1">
                {maxima["bendAngleCapability"] ? (
                  <>
                    <span className="font-semibold">{maxima["bendAngleCapability"].value.toFixed(0)}°</span>
                    <div className="text-[11px] text-gray-600 mt-1">{maxima["bendAngleCapability"].label}</div>
                  </>
                ) : (
                  <span className="text-gray-600">No parseable bend angles</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="font-semibold text-gray-900">Max wall @ 1.75&quot; DOM (published)</div>
              <div className="mt-1">
                {maxima["wallThicknessCapability"] ? (
                  <>
                    <span className="font-semibold">{maxima["wallThicknessCapability"].value.toFixed(3)}&quot;</span>
                    <div className="text-[11px] text-gray-600 mt-1">{maxima["wallThicknessCapability"].label}</div>
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
                    {/* RulesBlock contains legacy fixed-tier tables for some categories.
                        If ExactRules is present for this category, suppress RulesBlock to avoid duplicate/conflicting boxes. */}
                    {!skipGenericTierBox ? (
                      <RulesBlock
                        catKey={cat.key}
                        maxima={{
                          ...maxima,
                          maxOdMin: minima["maxDiameterRadius"],
                          maxOd: maxima["maxDiameterRadius"],
                          maxAngleMin: minima["bendAngleCapability"],
                          maxAngle: maxima["bendAngleCapability"],
                        } as any}
                      />
                    ) : (
                      <>
                        {cat.key === "maxDiameterRadius" && maxima["maxDiameterRadius"] ? (
                          <div className="mt-3 text-[11px] text-gray-600">
                            Current dataset OD range: {minima["maxDiameterRadius"]?.value?.toFixed(3)} in (min) → {maxima["maxDiameterRadius"]?.value?.toFixed(3)} in (max)
                          </div>
                        ) : null}
                        {cat.key === "bendAngleCapability" && maxima["bendAngleCapability"] ? (
                          <div className="mt-3 text-[11px] text-gray-600">
                            Current dataset angle range: {minima["bendAngleCapability"]?.value?.toFixed(0)}° (min) → {maxima["bendAngleCapability"]?.value?.toFixed(0)}° (max)
                          </div>
                        ) : null}
                      </>
                    )}
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
