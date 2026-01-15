/**
 * Simple, UI-focused description of the tube bender scoring system.
 */

import {
  calculateTubeBenderScore,
  type ScoringContext,
  type ScoringInput,
  type ScoreBreakdownItem,
} from "./scoringEngine";

/**
 * UI should never match scoring categories by display labels.
 * The legacy engine emits human-readable `criteria` strings only; we map those
 * to stable keys ONE time here (adapter layer) and the UI matches by key.
 */
const ENGINE_CRITERIA_TO_KEY: Record<string, string> = {
  "Value for Money": "valueForMoney",
  "Ease of Use & Setup": "easeOfUseSetup",
  "Max Diameter & CLR Capability": "maxDiameterRadius",
  "Bend Angle Capability": "bendAngleCapability",
  "Stress Capacity & Materials": "wallThicknessCapability",
  "Die Selection & Shapes": "dieSelectionShapes",
  "Track Record (Years in Business)": "yearsInBusiness",
  "Upgrade Path & Modularity": "upgradePathModularity",
  "Mandrel Compatibility": "mandrelCompatibility",
  "S-Bend Capability": "sBendCapability",
  "USA Manufacturing (Disclosure-Based)": "usaManufacturingDisclosure",
  "Origin Transparency": "originTransparency",
  "Single-Source System": "singleSourceSystem",
  "Warranty (Published Terms Only)": "warrantySupport",
};

function normalizeStringList(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const out = v.map((x) => String(x ?? "").trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof v === "string") {
    const out = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

// Normalize admin/catalog fields into the canonical inputs the scoring engine expects.
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    // Extract leading numeric token if present ("5 – ..." => 5)
    const m = s.match(/^(-?\d+(\.\d+)?)/);
    const n = Number(m ? m[1] : s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Admin fields commonly store "Yes"/"No" strings. JS treats any non-empty string as truthy,
// so using !!value will incorrectly treat "No" as true. Fix that here.
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) && v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (!s) return false;
    if (s === "yes" || s === "true" || s === "1") return true;
    if (s === "no" || s === "false" || s === "0") return false;
  }
  return false;
}

type MandrelTier = "none" | "economy" | "bronze";
function normalizeMandrelTier(v: unknown): MandrelTier {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "none";
  // Accept some legacy/admin variants safely.
  if (s === "none" || s === "no" || s === "not available" || s === "n/a") return "none";
  if (s === "economy" || s.includes("plastic") || s.includes("aluminum") || s.includes("aluminium") || s.includes("steel"))
    return "economy";
  if (s === "bronze" || s.includes("nickel") || s.includes("brass")) return "bronze";
  // Legacy value that used to mean "real system available"
  if (s === "available" || s === "standard") return "bronze";
  return "none";
}

function normalizeScoreInput<T extends Record<string, any>>(p: T): T {
  const out: any = { ...p };

  // Capacity naming drift:
  // Some catalog paths still use `capacity` for max round-tube OD.
  // The legacy scoring engine uses `maxCapacity`.
  if (out.maxCapacity == null && out.capacity != null) {
    out.maxCapacity = out.capacity;
  }

  // Key remaps (admin -> scorer canonical)
  if (out.maxBendAngle == null && out.bendAngle != null) {
    out.maxBendAngle = out.bendAngle;
  }
  if (out.maxWallAt175 == null && out.wallThicknessCapacity != null) {
    out.maxWallAt175 = out.wallThicknessCapacity;
  }

  // Also allow the reverse direction (some data sources still provide legacy names)
  if (out.bendAngle == null && out.maxBendAngle != null) {
    out.bendAngle = out.maxBendAngle;
  }
  if (out.wallThicknessCapacity == null && out.maxWallAt175 != null) {
    out.wallThicknessCapacity = out.maxWallAt175;
  }
  // Common legacy variant you printed in PS output
  if (out.wallThicknessCapacity == null && out.maxWall175Dom != null) {
    out.wallThicknessCapacity = out.maxWall175Dom;
  }

  // Mandrel normalization:
  // - Admin UI should store canonical tokens: "none" | "economy" | "bronze"
  // - Older data may still have "Available"/"None" or other variants.
  if (typeof out.mandrel === "string") {
    const s = out.mandrel.trim().toLowerCase();
    if (!s) {
      out.mandrel = "none";
    } else if (s === "available") {
      // Legacy label: treat as the best tier (bronze-class) to preserve intent.
      out.mandrel = "bronze";
    } else if (s === "none" || s === "no") {
      out.mandrel = "none";
    } else if (s === "economy") {
      out.mandrel = "economy";
    } else if (s.includes("bronze") || s.includes("nickel")) {
      // Be forgiving with labels like "Nickel/Bronze", "nickel-bronze", etc.
      out.mandrel = "bronze";
    } else {
      // Unknown strings default to none (FTC-safe: no guessing).
      out.mandrel = "none";
    }
  } else if (out.mandrel == null) {
    out.mandrel = "none";
  }

  // Parse numeric-ish fields
  if (out.maxCapacity != null) out.maxCapacity = toNumberOrNull(out.maxCapacity) ?? out.maxCapacity;
  if (out.maxBendAngle != null) out.maxBendAngle = toNumberOrNull(out.maxBendAngle) ?? out.maxBendAngle;
  if (out.maxWallAt175 != null) out.maxWallAt175 = toNumberOrNull(out.maxWallAt175) ?? out.maxWallAt175;
  if (out.bendAngle != null) out.bendAngle = toNumberOrNull(out.bendAngle) ?? out.bendAngle;
  if (out.wallThicknessCapacity != null) out.wallThicknessCapacity = toNumberOrNull(out.wallThicknessCapacity) ?? out.wallThicknessCapacity;

  // Tier fields come in as "5 – ..." strings from admin; scorer wants 0-5 numbers.
  if (out.usaManufacturingTier != null) out.usaManufacturingTier = toNumberOrNull(out.usaManufacturingTier) ?? out.usaManufacturingTier;
  if (out.originTransparencyTier != null) out.originTransparencyTier = toNumberOrNull(out.originTransparencyTier) ?? out.originTransparencyTier;
  if (out.singleSourceSystemTier != null) out.singleSourceSystemTier = toNumberOrNull(out.singleSourceSystemTier) ?? out.singleSourceSystemTier;
  if (out.warrantyTier != null) out.warrantyTier = toNumberOrNull(out.warrantyTier) ?? out.warrantyTier;

  return out;
}

export type ScoringMethod = "tier" | "scaled" | "binary" | "brand";

export type ScoringCategory = {
  /** 1–15 ordering as presented on the scoring page. */
  index: number;
  /** Stable key for future use in scoring/overlays. */
  key: string;
  /** Human-facing label. */
  name: string;
  /** Maximum points contributed to the 100-point total. */
  maxPoints: number;
  /** High-level scoring method (tier, scaled, binary, brand-based). */
  method: ScoringMethod;
  /** Short one-line description used in the UI. */
  tagline: string;
};

/** Total possible score across all categories. */
export const TOTAL_POINTS = 100;

/** 15-category, 100-point scoring framework. */
export const SCORING_CATEGORIES: ScoringCategory[] = [
  {
    index: 1,
    key: "valueForMoney",
    name: "Value for Money",
    maxPoints: 20,
    method: "scaled",
    tagline:
      "How much real capability and completeness you get per dollar for a typical starter system (frame + dies + power + stand).",
  },
  {
    index: 2,
    key: "easeOfUseSetup",
    name: "Ease of Use & Setup",
    maxPoints: 10,
    method: "tier",
    tagline:
      "Evidence-only checklist (0–7) plus portability/base configuration (0–3). No brand-based scoring.",
  },
  {
    index: 3,
    key: "maxDiameterRadius",
    name: "Max Diameter & CLR Capability",
    maxPoints: 10,
    method: "scaled",
    tagline:
      "Realistic maximum round tube size you can run on this frame with catalog tooling today. CLR ranges will be added to the math once every machine has documented CLR data.",
  },
  {
    index: 4,
    key: "bendAngleCapability",
    name: "Bend Angle Capability",
    maxPoints: 9,
    method: "scaled",
    tagline:
      "Maximum published bend angle in degrees (gross angle) for the machine + tooling. Missing angle scores 0.",
  },
  {
    index: 5,
    key: "wallThicknessCapability",
    name: "Stress Capacity & Materials",
    maxPoints: 10,
    method: "scaled",
    tagline:
      "Published max wall thickness for 1.75\" OD DOM (0–6), plus a simple count of documented compatible materials (0–4). Missing wall thickness scores 0 for the entire category.",
  },
  {
    index: 6,
    key: "dieSelectionShapes",
    name: "Die Selection & Shapes",
    maxPoints: 8,
    method: "tier",
    tagline:
      "Breadth of the die family: round tube, pipe, square, EMT, metric, plastic/urethane, and clearly documented \"other\" shapes.",
  },
  {
    index: 7,
    key: "yearsInBusiness",
    name: "Track Record (Years in Business)",
    maxPoints: 3,
    method: "tier",
    tagline:
      "Documented operating history of the brand. This matters, but far less than performance and features, so we keep the weight modest.",
  },
  {
    index: 8,
    key: "upgradePathModularity",
    name: "Upgrade Path & Modularity",
    maxPoints: 8,
    method: "tier",
    tagline:
      "Factory-supported power upgrades, length/rotation indexing, angle measurement, auto-stop, thick/thin-wall upgrades, and wiper-die support – one point for each documented upgrade.",
  },
  {
    index: 9,
    key: "mandrelCompatibility",
    name: "Mandrel Compatibility",
    maxPoints: 4,
    method: "tier",
    tagline:
      "Documented support for mandrel bending on this frame (or a direct factory kit). No guesses; only what's clearly supported by the manufacturer.",
  },
  {
    index: 10,
    key: "sBendCapability",
    name: "True S-Bend Capability",
    maxPoints: 3,
    method: "binary",
    tagline:
      "Ability to make a true S-bend with ≤0.125\" straight between opposing bends, proven by documentation or repeatable test pieces. Marketing photos with several inches of straight do not count.",
  },
  {
    index: 11,
    key: "usaManufacturingDisclosure",
    name: "USA Manufacturing (Disclosure-Based)",
    maxPoints: 5,
    method: "tier",
    tagline:
      "Points based strictly on what the manufacturer publicly claims about where frames, dies, and hydraulics are made or assembled. We do not independently verify or guess where parts are actually made.",
  },
  {
    index: 12,
    key: "originTransparency",
    name: "Origin Transparency",
    maxPoints: 5,
    method: "tier",
    tagline:
      "How clearly the manufacturer explains where major components come from. This scores the quality of disclosure, not the origin itself.",
  },
  {
    index: 13,
    key: "singleSourceSystem",
    name: "Single-Source System",
    maxPoints: 2,
    method: "binary",
    tagline:
      "Binary: can a normal buyer obtain a complete, fully functional bending system (frame + dies + hydraulics/lever) from one primary manufacturer/storefront, or not?",
  },
  {
    index: 14,
    key: "warrantySupport",
    name: "Warranty (Published Terms Only)",
    maxPoints: 3,
    method: "tier",
    tagline:
      "Warranty strength based strictly on the published terms (coverage and duration). We do not score how well the warranty is honored in practice.",
  },
];

/** Source of a product score for transparency. */
export type ProductScoreSource = "manual" | "computed" | "none";

export type ProductScore = {
  /** 0–TOTAL_POINTS when known; null when no score is available. */
  total: number | null;
  /** Whether the score came from an admin override, future algorithm, or is missing. */
  source: ProductScoreSource;
  /**
   * Optional per-category breakdown when using the computed algorithm.
   * Adapter adds a stable `key` for UI matching (do not match on `criteria` labels).
   */
  breakdown?: (ScoreBreakdownItem & { key?: string })[];
  /**
   * Small diagnostic payload for UI panels (no devtools needed).
   * This is the *interpreted* inputs we actually fed the scoring engine.
   */
  debugInput?: Record<string, unknown>;
};

/**
 * Scoring behavior:
 * - We always attempt to compute a score + breakdown via the legacy scoring
 *   engine, using a best-effort adapter from whatever catalog fields exist.
 * - There are no manual overrides: the total score is always derived from the
 *   algorithm. If we cannot compute anything sane, we return
 *   { total: null, source: "none" }.
 */
export function getProductScore(
  product:
    | {
        id?: string | undefined;
      }
    | null
    | undefined,
  ctx?: ScoringContext,
): ProductScore {
  if (!product) {
    return { total: null, source: "none" };
  }

  // IMPORTANT: public pages pass merged catalog + admin overlay.
  // Admin overlay uses UI-friendly strings and some different key names.
  // Normalize before scoring so edits actually affect the score.
  const p: any = normalizeScoreInput(product);

  // Derive a system "entry price" from component-level min/max pricing where available.
  const parsePrice = (v: unknown): number =>
    typeof v === "number"
      ? v
      : parseFloat(String(v ?? "").replace(/[^0-9.+-]/g, "")) || 0;

  const minTotal =
    parsePrice(p.framePriceMin) +
    parsePrice(p.diePriceMin) +
    parsePrice(p.hydraulicPriceMin) +
    parsePrice(p.standPriceMin);

  const maxTotal =
    parsePrice(p.framePriceMax) +
    parsePrice(p.diePriceMax) +
    parsePrice(p.hydraulicPriceMax) +
    parsePrice(p.standPriceMax);

  // Entry-level system price used for Value for Money.
  // Prefer the conservative minimum system total; if that is missing, fall back
  // to the max system total, then any existing catalog price/priceRange.
  let entryPrice: number | undefined;
  if (minTotal > 0) {
    entryPrice = minTotal;
  } else if (maxTotal > 0) {
    entryPrice = maxTotal;
  } else if (parsePrice(p.price) > 0) {
    entryPrice = parsePrice(p.price);
  }

  // --- Adapter into the legacy engine ---
  const scoringInput: ScoringInput = {
    brand: p.brand ?? undefined,
    powerType: p.powerType ?? undefined,
    entryPrice,
    // Ease of Use is now evidence-only (no subjective tiers, no brand scoring).
    // Portability is already a normalized token; the rest are boolean/enum flags.
    // Legacy engine uses maxCapacity (stringy) and bendAngle (number)
    maxCapacity:
      p.maxCapacity != null && String(p.maxCapacity).trim() !== ""
        ? String(p.maxCapacity).trim()
        : undefined,
    bendAngle:
      p.maxBendAngle != null && String(p.maxBendAngle).trim() !== ""
        ? Number(toNumberOrNull(p.maxBendAngle))
        : undefined,
    dieShapes: Array.isArray(p.dieShapes) ? p.dieShapes : [],
    yearsInBusiness:
      p.yearsInBusiness != null && String(p.yearsInBusiness).trim() !== ""
        ? Number(toNumberOrNull(p.yearsInBusiness))
        : undefined,
    usaManufacturingTier: p.usaManufacturingTier ?? p.usaManufacturingDisclosure ?? 0,
    originTransparencyTier: p.originTransparencyTier ?? 0,
    singleSourceSystemTier: p.singleSourceSystemTier ?? 0,
    warrantyTier: p.warrantyTier ?? 0,
    portability: p.portability ?? undefined,
    wallThicknessCapacity:
      p.wallThicknessCapacity != null && String(p.wallThicknessCapacity).trim() !== ""
        ? Number(toNumberOrNull(p.wallThicknessCapacity))
        : undefined,
    materials: normalizeStringList(p.materials),
    dieShapesTier: p.dieShapesTier ?? undefined,
    mandrel: p.mandrel ?? "none",
    hasPowerUpgradePath: toBool(p.hasPowerUpgradePath),
    // Ease of Use & Setup (Category #2) – evidence-only flags
    hasManual: toBool(p.hasManual),
    hasOnMachineInstructions: toBool(p.hasOnMachineInstructions),
    hasAngleReference: toBool(p.hasAngleReference),
    hasAngleStop: toBool(p.hasAngleStop),
    rotationAid: typeof p.rotationAid === "string" ? p.rotationAid : undefined,
    quickDieChange: toBool(p.quickDieChange),
    hasMfrYoutubeModelContent: toBool(p.hasMfrYoutubeModelContent),
    hasSetupMountingGuidance: toBool(p.hasSetupMountingGuidance),
    lengthStop: toBool(p.lengthStop),
    rotationIndexing: toBool(p.rotationIndexing),
    angleMeasurement: toBool(p.angleMeasurement),
    autoStop: toBool(p.autoStop),
    thickWallUpgrade: toBool(p.thickWallUpgrade),
    thinWallUpgrade: toBool(p.thinWallUpgrade),
    wiperDieSupport: toBool(p.wiperDieSupport),
    sBendCapability: toBool(p.sBendCapability),
  };

  // Expose the actual interpreted inputs for UI diagnostics.
  // (Keeps this transparent without opening devtools.)
  const debugInput = {
    entryPrice: scoringInput.entryPrice ?? null,
    brand: scoringInput.brand ?? null,
    powerType: scoringInput.powerType ?? null,
    easeOfUseTier: (scoringInput as any).easeOfUseTier ?? null,
    maxCapacity: scoringInput.maxCapacity ?? null,
    bendAngle: scoringInput.bendAngle ?? null,
    wallThicknessCapacity: scoringInput.wallThicknessCapacity ?? null,
    materialsCount: Array.isArray(scoringInput.materials) ? scoringInput.materials.length : null,
    yearsInBusiness: scoringInput.yearsInBusiness ?? null,
    dieShapesCount: Array.isArray(scoringInput.dieShapes) ? scoringInput.dieShapes.length : null,
    mandrel: scoringInput.mandrel ?? null,
  };

  try {
    const scored = calculateTubeBenderScore(scoringInput);
    if (!Number.isFinite(scored.totalScore)) {
      return { total: null, source: "none" };
    }

    // Normalize whitespace in reasoning to avoid newlines leaking into UI/export
    const normalizedBreakdown: (ScoreBreakdownItem & { key?: string })[] = Array.isArray(scored.scoreBreakdown)
      ? scored.scoreBreakdown.map((b) => ({
          ...b,
          // Stable key used by UI matching. If unknown, omit key (UI can warn/fallback).
          key: ENGINE_CRITERIA_TO_KEY[b.criteria],
          reasoning:
            typeof b.reasoning === "string"
              ? b.reasoning.replace(/\s+/g, " ").trim()
              : b.reasoning,
        }))
      : [];

    // Minimal, on-page diagnostics without devtools.
    // The review page can display this via score.breakdown (criteria/reasoning).
    normalizedBreakdown.unshift({
      criteria: "Scoring Inputs (debug)",
      key: "debugInput",
      points: 0,
      maxPoints: 0,
      reasoning: JSON.stringify(
        { entryPrice, maxCapacity: scoringInput.maxCapacity, bendAngle: scoringInput.bendAngle, wallThicknessCapacity: scoringInput.wallThicknessCapacity },
        null,
        2,
      ),
    });

    return {
      total: scored.totalScore,
      source: "computed",
      breakdown: normalizedBreakdown,
      debugInput,
    };
  } catch (err) {
    console.warn("[scoring] failed to compute score:", err);
    return { total: null, source: "none", debugInput };
  }
}
