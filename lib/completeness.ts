// lib/completeness.ts
//
// SINGLE SOURCE OF TRUTH for "is this model complete enough to go live?"
//
// A model is ACTIVE only when every field that drives the numerical score is
// either (a) filled with a real value, or (b) explicitly marked
// "not published by manufacturer". A blank required field (never researched)
// keeps the model INACTIVE so it never shows on the public site with a broken
// zero score.
//
// This module is isomorphic (pure, no server-only APIs) so the same logic runs
// on the server (public read gate) and in the admin editor (completeness meter).

import { computeSystemPrice } from "./systemPrice";

/** Number of fully-complete models required before the temp banner may retire. */
export const ACTIVE_THRESHOLD = 8;

/**
 * How a required field is judged "filled":
 * - "value": a non-empty text/number/enum token (enum "0"/"none"/"fixed" count).
 * - "bool":  an explicit Yes/No (admin stores "Yes"|"No"; "" means not entered).
 * - "list":  at least one selected item (comma string or array).
 * - "systemPrice": the frame+die+power+stand math resolves to a positive entry price.
 */
export type FieldKind = "value" | "bool" | "list" | "systemPrice";

export type RequiredField = {
  key: string;
  label: string;
  kind: FieldKind;
};

/**
 * Every field that drives the 100-point score (see lib/scoringEngine.ts).
 * Order roughly follows the 14 scoring categories. `systemPrice` stands in for
 * the frame/die/hydraulic/stand price block that feeds Value for Money.
 *
 * NOTE: `powerType` and `country` are display columns, not score drivers, so
 * they intentionally do NOT gate activation. To require them, add them here.
 */
export const REQUIRED_SCORING_FIELDS: RequiredField[] = [
  // Value for Money (20)
  { key: "systemPrice", label: "System price (frame + die + power + stand)", kind: "systemPrice" },

  // Ease of Use & Setup (10)
  { key: "portability", label: "Portability / base configuration", kind: "value" },
  { key: "hasManual", label: "Manual available", kind: "bool" },
  { key: "hasOnMachineInstructions", label: "On-machine instructions", kind: "bool" },
  { key: "hasAngleReference", label: "Built-in bend angle reference", kind: "bool" },
  { key: "hasAngleStop", label: "Angle stop available", kind: "bool" },
  { key: "rotationAid", label: "Rotation aid type", kind: "value" },
  { key: "quickDieChange", label: "Quick die change aid", kind: "bool" },
  { key: "hasMfrYoutubeModelContent", label: "Official YouTube model content", kind: "bool" },

  // Max Diameter & CLR (10)
  { key: "maxCapacity", label: "Max Capacity (OD, inches)", kind: "value" },

  // Bend Angle (9)
  { key: "bendAngle", label: "Bend Angle (°)", kind: "value" },

  // Stress Capacity & Materials (10)
  { key: "wallThicknessCapacity", label: "Wall Thickness (1.75\" DOM)", kind: "value" },
  { key: "materials", label: "Materials compatibility", kind: "list" },

  // Die Selection & Shapes (8)
  { key: "dieShapes", label: "Die shapes", kind: "list" },

  // Track Record / Years in Business (3)
  { key: "yearsInBusiness", label: "Years in business", kind: "value" },

  // Upgrade Path & Modularity (8)
  { key: "hasPowerUpgradePath", label: "Power upgrade path", kind: "bool" },
  { key: "lengthStop", label: "Length stop / backstop", kind: "bool" },
  { key: "rotationIndexing", label: "Rotation indexing", kind: "bool" },
  { key: "angleMeasurement", label: "Built-in angle measurement", kind: "bool" },
  { key: "autoStop", label: "Auto stop for bend angle", kind: "bool" },
  { key: "thickWallUpgrade", label: "Thick-wall upgrade tooling", kind: "bool" },
  { key: "thinWallUpgrade", label: "Thin-wall / quality upgrade tooling", kind: "bool" },
  { key: "wiperDieSupport", label: "Wiper die support", kind: "bool" },

  // Mandrel Compatibility (4)
  { key: "mandrel", label: "Mandrel option", kind: "value" },

  // S-Bend Capability (3)
  { key: "sBendCapability", label: "S-Bend capable", kind: "bool" },

  // USA Manufacturing Claim (2)
  { key: "usaClaim", label: "USA manufacturing claim", kind: "value" },

  // Origin Disclosure (8) — one state per major component
  { key: "discloseFrame", label: "Frame origin disclosed?", kind: "value" },
  { key: "discloseDies", label: "Dies/tooling origin disclosed?", kind: "value" },
  { key: "discloseHydraulics", label: "Hydraulic/power origin disclosed?", kind: "value" },
  { key: "discloseMotor", label: "Pump/motor origin disclosed?", kind: "value" },
  { key: "discloseControls", label: "Controls/electronics origin disclosed?", kind: "value" },

  // Single-Source System (2)
  { key: "singleSourceSystemTier", label: "Single-source system", kind: "value" },

  // Warranty (3)
  { key: "warrantyTier", label: "Warranty tier", kind: "value" },
];

/** Read the per-field "not published by manufacturer" map from a product/fields blob. */
export function getNotPublishedMap(fields: any): Record<string, boolean> {
  const np = fields?.notPublished;
  if (np && typeof np === "object" && !Array.isArray(np)) return np as Record<string, boolean>;
  return {};
}

export function isFieldNotPublished(fields: any, key: string): boolean {
  return getNotPublishedMap(fields)[key] === true;
}

function valueFilled(v: unknown): boolean {
  return String(v ?? "").trim() !== "";
}

function boolFilled(v: unknown): boolean {
  if (typeof v === "boolean") return true;
  return String(v ?? "").trim() !== "";
}

function listFilled(v: unknown): boolean {
  if (Array.isArray(v)) {
    return v.map((x) => String(x ?? "").trim()).filter(Boolean).length > 0;
  }
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length > 0;
}

/** Is a single required field satisfied (real value OR marked not-published)? */
export function isRequiredFieldComplete(fields: any, field: RequiredField): boolean {
  if (isFieldNotPublished(fields, field.key)) return true;

  switch (field.kind) {
    case "bool":
      return boolFilled(fields?.[field.key]);
    case "list":
      return listFilled(fields?.[field.key]);
    case "systemPrice": {
      const entry = computeSystemPrice(fields)?.entry;
      return typeof entry === "number" && Number.isFinite(entry) && entry > 0;
    }
    case "value":
    default:
      return valueFilled(fields?.[field.key]);
  }
}

export type CompletenessResult = {
  total: number;
  filled: number;
  /** Fields still missing (never entered and not marked not-published). */
  missing: RequiredField[];
  /** filled / total, 0..1. */
  ratio: number;
  /** True only when every required field is satisfied. */
  complete: boolean;
};

/** Compute how complete a single model is against the required scoring fields. */
export function computeCompleteness(fields: any): CompletenessResult {
  const total = REQUIRED_SCORING_FIELDS.length;
  const missing: RequiredField[] = [];
  let filled = 0;

  for (const field of REQUIRED_SCORING_FIELDS) {
    if (isRequiredFieldComplete(fields, field)) filled += 1;
    else missing.push(field);
  }

  return {
    total,
    filled,
    missing,
    ratio: total > 0 ? filled / total : 0,
    complete: missing.length === 0,
  };
}

/** True when the model has every scoring field filled or marked not-published. */
export function isModelActive(fields: any): boolean {
  return computeCompleteness(fields).complete;
}

function scoreOf(p: any): number {
  const s = p?.score?.total;
  return typeof s === "number" && Number.isFinite(s) ? s : -1;
}

export type PublicSelection<T> = {
  /** Models to show publicly (active-only once threshold met, else most-complete fallback). */
  visible: T[];
  /** Count of fully-complete (active) models across the whole roster. */
  activeCount: number;
  /** Total models in the roster. */
  totalCount: number;
  /** True once activeCount >= ACTIVE_THRESHOLD. */
  thresholdMet: boolean;
};

/**
 * Decide which models the public site should show.
 *
 * - Once ACTIVE_THRESHOLD models are complete: show ONLY active models.
 * - Before that: show the most-complete `threshold` models (active first, then
 *   by completeness, then by score) so the page is never empty while filling in.
 *
 * Products are expected to carry `.score` (attached by getAllTubeBendersWithOverlay)
 * for the fallback tie-break; missing scores just sort last.
 */
export function selectPublicModels<T extends Record<string, any>>(
  products: T[],
  threshold: number = ACTIVE_THRESHOLD,
): PublicSelection<T> {
  const meta = products.map((p) => ({ p, active: isModelActive(p), ratio: computeCompleteness(p).ratio }));
  const activeCount = meta.filter((m) => m.active).length;
  const thresholdMet = activeCount >= threshold;

  let visible: T[];
  if (thresholdMet) {
    visible = meta.filter((m) => m.active).map((m) => m.p);
  } else {
    visible = meta
      .slice()
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (b.ratio !== a.ratio) return b.ratio - a.ratio;
        return scoreOf(b.p) - scoreOf(a.p);
      })
      .slice(0, threshold)
      .map((m) => m.p);
  }

  return { visible, activeCount, totalCount: products.length, thresholdMet };
}
