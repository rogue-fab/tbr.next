/**
 * Legacy, but fully transparent, tube-bender scoring engine.
 *
 * This is a direct adaptation of the original Replit-era algorithm, rewritten
 * to be self-contained and defensive. It does NOT depend on any shared schema
 * or database models – it operates on a generic "product-like" shape.
 *
 * Integration into the current catalog happens via adapter code elsewhere.
 */

export type ScoringContext = {
  /**
   * Dataset min/max used for autoscaling in specific categories.
   * If omitted, those categories fall back to fixed thresholds (backward compatible).
   */
  minOdIn?: number | null;
  maxOdIn?: number | null;
  minBendAngleDeg?: number | null;
  maxBendAngleDeg?: number | null;

  /**
   * Value-for-money autoscale band (computed from a dataset snapshot).
   * Uses P10/P90 of rawValue = capabilityPoints/entryPrice.
   *
   * If omitted, Value for Money falls back to legacy entryPrice bands.
   */
  valueP10?: number | null;
  valueP90?: number | null;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function roundInt(n: number): number {
  return Math.round(n);
}

function lerpPointsClamped(
  value: number,
  lo: number,
  hi: number,
  minPoints: number,
  maxPoints: number,
): number {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  if (hi <= lo) return 0;
  const v = clamp(value, lo, hi);
  const t = (v - lo) / (hi - lo);
  const raw = minPoints + t * (maxPoints - minPoints);
  return clamp(roundInt(raw), minPoints, maxPoints);
}

// NOTE: Autoscaling was tested and intentionally disabled for FTC safety and
// human reproducibility. The /scoring page defines fixed, explicit tiers for
// each category. Do not re-enable autoscaling without a full methodology and
// legal-risk review.
/**
 * Autoscale with "missing=0, lowest=1, highest=maxPoints" to maximize discrimination.
 * - If dataset min/max are missing, signal caller to use legacy fallback.
 * - If min==max, every defined value gets maxPoints (no discrimination possible).
 */
function minMaxScaledPoints(
  value: number | undefined,
  datasetMin: number | null | undefined,
  datasetMax: number | null | undefined,
  maxPoints: number,
): number {
  if (value == null || !Number.isFinite(value)) return 0; // undefined stays 0 by design
  if (datasetMin == null || datasetMax == null) return -1;
  if (!Number.isFinite(datasetMin) || !Number.isFinite(datasetMax)) return -1;
  if (datasetMax <= 0) return -1;
  if (datasetMin <= 0) return -1;

  // Clamp input into observed dataset range so outliers don't produce >maxPoints.
  const v = clamp(value, datasetMin, datasetMax);

  // If all machines share the same value, give full points to all defined values.
  if (datasetMax === datasetMin) return maxPoints;

  // Map: datasetMin -> 1, datasetMax -> maxPoints
  // points = 1 + round(((v - min)/(max - min)) * (maxPoints - 1))
  const t = (v - datasetMin) / (datasetMax - datasetMin);
  const raw = 1 + t * (maxPoints - 1);
  return clamp(roundInt(raw), 1, maxPoints);
}

// Extract leading integer tier from a string like "5 – Frame + dies + hydraulics..."
// or accept a numeric value directly. Clamps to [0, max].
function parseTier(raw: unknown, max: number): number {
  if (raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = raw;
    return Math.max(0, Math.min(max, n));
  }

  const text = String(raw).trim();
  const match = text.match(/^(\d+)/);
  if (!match) return 0;

  const n = Number(match[1]);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

export interface ScoringCriteria {
  name: string;
  maxPoints: number;
  description: string;
  weight: number;
}

/**
 * Human-readable criteria reference. Not currently used in calculations, and
 * not kept perfectly in sync with the live scoring categories. Treat this as
 * legacy documentation only.
 */
export const SCORING_CRITERIA: ScoringCriteria[] = [
  {
    name: "Value for Money",
    maxPoints: 20,
    description: "Price-to-performance ratio based on base/minimum price of the range",
    weight: 0.2,
  },
  {
    name: "Ease of Use & Setup",
    maxPoints: 11,
    description: "Assembly time, portability, operation simplicity",
    weight: 0.11,
  },
  {
    name: "Max Diameter Capacity",
    maxPoints: 10,
    description: "Maximum tube diameter capability (CLR to be added later once fully documented).",
    weight: 0.1,
  },
  {
    name: "Bend Angle Capability",
    maxPoints: 9,
    description: "Maximum bend angle achievable (180°+ preferred)",
    weight: 0.09,
  },
  {
    name: "Wall Thickness Capability",
    maxPoints: 9,
    description: "Maximum wall thickness for 1.75\" OD DOM tubing, plus documented material coverage.",
    weight: 0.09,
  },
  {
    name: "Die Selection & Shapes",
    maxPoints: 8,
    description:
      "Available die coverage for round tube, pipe, square, EMT, metric round/square, plastic/urethane pressure dies, and other documented shapes.",
    weight: 0.08,
  },
  {
    name: "Years in Business",
    maxPoints: 3,
    description: "Company longevity and market experience (lightly weighted).",
    weight: 0.03,
  },
  {
    name: "Upgrade Path & Modularity",
    maxPoints: 8,
    description:
      "Documented upgrade path for power, LRA control (length, rotation, angle, auto-stop), and bend-quality tooling (thin/thick wall, wipers).",
    weight: 0.08,
  },
  {
    name: "Mandrel Compatibility",
    maxPoints: 4,
    description:
      "Mandrel bending capability – 0 for none, 2 for 'economy' mandrels, 4 for bronze or equivalent factory-supported system.",
    weight: 0.04,
  },
  {
    name: "S-Bend Capability",
    maxPoints: 3,
    description: "Ability to create S-bends and complex geometries under a strict ≤0.125\" tangent rule.",
    weight: 0.03,
  },
  {
    name: "USA Manufacturing (Disclosure-Based)",
    maxPoints: 5,
    description: "Tiered points based on what the manufacturer publicly claims about origin.",
    weight: 0.05,
  },
  {
    name: "Origin Transparency",
    maxPoints: 5,
    description: "How clearly the manufacturer documents origin of major components.",
    weight: 0.05,
  },
  {
    name: "Single-Source System",
    maxPoints: 2,
    description: "Binary: 2 pts if full system from one primary source, else 0.",
    weight: 0.02,
  },
  {
    name: "Warranty (Published Terms Only)",
    maxPoints: 3,
    description: "Published warranty strength (duration and coverage); not how often it is honored.",
    weight: 0.03,
  },
];

export interface ScoreBreakdownItem {
  criteria: string;
  points: number;
  maxPoints: number;
  reasoning: string;
}

/**
 * Minimal shape that the scoring algorithm expects. All fields are optional and
 * are handled defensively so we can adapt from different catalog shapes.
 */
export interface ScoringInput {
  id?: string;
  brand?: string;
  model?: string;
  priceRange?: string;
  entryPrice?: number;
  powerType?: string;
  portability?: "fixed" | "portable" | "portable_with_rolling_option" | "rolling_standard" | string;

  // Ease of Use & Setup (Category #2) – evidence-only fields
  hasManual?: boolean;
  hasOnMachineInstructions?: boolean;
  hasAngleReference?: boolean;
  hasAngleStop?: boolean;
  rotationAid?: "none" | "magnet_on_tube" | "clamp_on_analog" | "clamp_on_digital" | "chuck_or_indexer" | string;
  quickDieChange?: boolean;
  hasMfrYoutubeModelContent?: boolean;
  hasSetupMountingGuidance?: boolean;
  maxCapacity?: string;
  maxTubeOD?: number;
  maxBendAngle?: number;
  countryOfOrigin?: string;
  bendAngle?: number;
  wallThicknessCapacity?: string | number;
  features?: string[];
  materials?: string[];
  dieShapes?: string[];
  upgradeFlags?: string[];
  // Upgrade path & modularity flags (YES/NO in admin; normalized in engine)
  hasPowerUpgradePath?: string | boolean;
  lengthStop?: string | boolean;
  rotationIndexing?: string | boolean;
  angleMeasurement?: string | boolean;
  autoStop?: string | boolean;
  thickWallUpgrade?: string | boolean;
  thinWallUpgrade?: string | boolean;
  wiperDieSupport?: string | boolean;
  mandrelBender?: string;
  sBendCapability?: boolean;
  // Disclosure-based scoring tiers (from admin overlay)
  usaManufacturingTier?: string | number | null;
  originTransparencyTier?: string | number | null;
  singleSourceSystemTier?: string | number | null;
  warrantyTier?: string | number | null;
  [key: string]: unknown;
}

export interface ScoredResult {
  totalScore: number;
  scoreBreakdown: ScoreBreakdownItem[];
}

/**
 * Core scoring function.
 *
 * This is a direct port of the original calculateTubeBenderScore(bender)
 * implementation, with added null/undefined guards and string coercion so that
 * it is safe to call even when some fields are missing.
 */
function portabilityPoints(portability: ScoringInput["portability"]): number {
  switch (String(portability ?? "").trim().toLowerCase()) {
    case "rolling_standard":
      return 3;
    case "portable_with_rolling_option":
      return 2;
    case "portable":
      return 1;
    case "fixed":
    default:
      return 0;
  }
}

function easeChecklistPoints(input: ScoringInput): number {
  let pts = 0;
  if (input.hasManual) pts += 1;
  if (input.hasOnMachineInstructions) pts += 1;
  if (input.hasAngleReference) pts += 1;
  if (input.hasAngleStop) pts += 1;

  const ra = String(input.rotationAid ?? "").trim().toLowerCase();
  // 1 pt only for clamp-on (analog/digital) or chuck/indexer. Magnet-only or none = 0.
  if (ra === "clamp_on_analog" || ra === "clamp_on_digital" || ra === "chuck_or_indexer") pts += 1;

  if (input.quickDieChange) pts += 1;
  if (input.hasMfrYoutubeModelContent) pts += 1;
  return pts;
}

/**
 * Canonical resolver for Max OD (inches).
 *
 * Accepts legacy aliases but centralizes interpretation in ONE place.
 * If value is missing or unparseable, returns null (scores 0).
 *
 * NOTE: This intentionally avoids dataset-relative logic.
 * Fixed tiers are the authoritative scoring model for Category #3.
 */
function resolveMaxOdIn(bender: ScoringInput): number | null {
  const raw =
    (bender as any)?.maxCapacity ??
    (bender as any)?.capacity ??
    null;
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Canonical resolver for maximum bend angle (degrees).
 *
 * Prefers `maxBendAngle` when present; falls back to legacy `bendAngle`.
 * Returns null if missing or unparseable.
 *
 * Fixed-tier scoring only. Dataset-relative autoscaling is intentionally disabled.
 */
function resolveMaxBendAngleDeg(bender: ScoringInput): number | null {
  const raw =
    (bender as any)?.maxBendAngle ??
    (bender as any)?.bendAngle ??
    null;
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function calculateTubeBenderScore(
  bender: ScoringInput,
  ctx?: ScoringContext,
): ScoredResult {
  const scoreBreakdown: ScoreBreakdownItem[] = [];
  let totalScore = 0;

  // 1. Value for Money (legacy stub; real value is layered in getProductScore)
  let valueScore = 0;
  const entryPrice = typeof (bender as any).entryPrice === "number" ? (bender as any).entryPrice : NaN;

  // We compute Value after the other categories so we can reuse their actual points.
  // Keep a placeholder breakdown item and overwrite it later.
  scoreBreakdown.push({
    criteria: "Value for Money",
    points: 0,
    maxPoints: 20,
    reasoning: "Value for Money pending calculation.",
  });

  // IMPORTANT: Value points are added at the end (after capability categories are scored).

  // 2. Ease of Use & Setup (10 points)
  //
  // Evidence-only scoring: 0–3 portability + 0–7 evidence checklist. No brand scoring. No subjective tiers.
  const easePort = portabilityPoints(bender.portability);
  const easeChk = easeChecklistPoints(bender);
  const easePoints = Math.min(10, easePort + easeChk);

  const portabilityLabel =
    easePort === 3
      ? "rolling_standard"
      : easePort === 2
      ? "portable_with_rolling_option"
      : easePort === 1
      ? "portable"
      : "fixed";

  scoreBreakdown.push({
    criteria: "Ease of Use & Setup",
    points: easePoints,
    maxPoints: 10,
    reasoning:
      `Portability: ${easePort}/3. Evidence checklist: ${easeChk}/7. ` +
      `Manual=${bender.hasManual ? "Yes" : "No"}, On-machine instructions=${bender.hasOnMachineInstructions ? "Yes" : "No"}, ` +
      `Angle reference=${bender.hasAngleReference ? "Yes" : "No"}, Angle stop=${bender.hasAngleStop ? "Yes" : "No"}, ` +
      `Rotation aid=${String(bender.rotationAid ?? "none")}, Quick die change=${bender.quickDieChange ? "Yes" : "No"}, ` +
      `Mfr YouTube model content=${bender.hasMfrYoutubeModelContent ? "Yes" : "No"}.`,
  });
  totalScore += easePoints;

  // 3. Max Diameter & CLR Capability (10 pts)
  // Fixed tiers only (FTC-safe, human reproducible). CLR is display-only (not scored).
  {
    const maxPoints = 10;
    const od = (() => {
      // legacy input is often a string field (maxCapacity) representing OD in inches
      const raw = bender?.maxCapacity ?? (bender as any)?.capacity ?? "";
      const n = Number(String(raw).trim());
      return Number.isFinite(n) ? n : undefined;
    })();

    let pts = 0;
    const v = od ?? 0;
    if (v >= 2.5) pts = 10;
    else if (v >= 2.375) pts = 9;
    else if (v >= 2.25) pts = 8;
    else if (v >= 2.0) pts = 7;
    else if (v >= 1.75) pts = 5;
    else if (v >= 1.5) pts = 3;
    else if (v > 0) pts = 2;
    else pts = 0;

    totalScore += pts;
    scoreBreakdown.push({
      criteria: "Max Diameter & CLR Capability",
      points: pts,
      maxPoints,
      reasoning:
        od != null
          ? `Fixed OD tiers. OD=${od} in. CLR is display-only (not scored).`
          : "No published/entered max OD (capacity) value; this category scores 0 rather than guessing. CLR is display-only (not scored).",
    });
  }

  // 4. Bend Angle Capability (9 pts)
  // Fixed tiers only (FTC-safe, human reproducible).
  {
    const maxPoints = 9;
    const angle = (() => {
      const raw = bender?.bendAngle ?? (bender as any)?.maxBendAngle ?? "";
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    })();

    let pts = 0;
    const a = angle ?? 0;
    if (a >= 195) pts = 9;
    else if (a >= 180) pts = 7;
    else if (a >= 120) pts = 4;
    else if (a > 0) pts = 2;
    else pts = 0;

    totalScore += pts;
    scoreBreakdown.push({
      criteria: "Bend Angle Capability",
      points: pts,
      maxPoints,
      reasoning:
        angle != null
          ? `Fixed angle tiers. Angle=${angle} deg.`
          : "No published/entered max bend angle value; this category scores 0 rather than guessing.",
    });
  }

  // 5. Stress Capacity & Materials (10 points)
  //
  // Evidence-only scoring:
  // - Thickness points (0–6) from published max wall thickness for 1.75" OD DOM.
  // - Materials points (0–4) from count of documented compatible materials (from a fixed list).
  //
  // Non-negotiable FTC rule:
  // If wall thickness is missing/unknown, the ENTIRE category scores 0 (we do not infer stress capacity).
  let thicknessScore = 0;
  let materialScore = 0;
  const wallRaw = bender.wallThicknessCapacity;
  let wallReasonPart: string;
  let materialReasonPart = "";

  if (wallRaw !== undefined && wallRaw !== null && wallRaw !== "") {
    const thickness = parseFloat(String(wallRaw));
    if (Number.isFinite(thickness)) {
      // Thickness points (0–6) — fixed thresholds
      // 0: undefined/missing
      // 1: ≥ 0.095"
      // 2: ≥ 0.120"
      // 3: ≥ 0.156"
      // 4: ≥ 0.188"
      // 5: ≥ 0.250"
      // 6: ≥ 0.875" (solid bar; half of 1.75" is 0.875")
      if (thickness >= 0.875) {
        thicknessScore = 6;
        wallReasonPart = `Supports solid bar bending up to 1.75" diameter (0.875").`;
      } else if (thickness >= 0.25) {
        thicknessScore = 5;
        wallReasonPart = `${wallRaw}" published max wall for 1.75" OD DOM.`;
      } else if (thickness >= 0.188) {
        thicknessScore = 4;
        wallReasonPart = `${wallRaw}" published max wall for 1.75" OD DOM.`;
      } else if (thickness >= 0.156) {
        thicknessScore = 3;
        wallReasonPart = `${wallRaw}" published max wall for 1.75" OD DOM.`;
      } else if (thickness >= 0.12) {
        thicknessScore = 2;
        wallReasonPart = `${wallRaw}" published max wall for 1.75" OD DOM.`;
      } else if (thickness >= 0.095) {
        thicknessScore = 1;
        wallReasonPart = `${wallRaw}" published max wall for 1.75" OD DOM.`;
      } else {
        thicknessScore = 0;
        wallReasonPart = `${wallRaw}" published max wall for 1.75" OD DOM (below scoring threshold).`;
      }
    } else {
      thicknessScore = 0;
      wallReasonPart = `Unparseable wall thickness value: ${String(wallRaw)}.`;
    }

    // Materials scoring (0–4 points)
    // Fixed list (count only what is explicitly documented):
    // Steel, Stainless, 4130, Aluminum, Titanium, Copper, Brass
    // Points:
    // 0 = not listed
    // 1 = 1+ in list
    // 2 = 3+ in list
    // 3 = 5+ in list
    // 4 = 7+ in list (all covered)
    const rawMaterials = Array.isArray(bender.materials)
      ? (bender.materials as unknown[])
      : [];

    const materialSlugs = rawMaterials
      .map((m) => String(m || "").trim().toLowerCase())
      .filter(Boolean);

    let hasSteel = false;
    let hasStainless = false;
    let has4130 = false;
    let hasAluminum = false;
    let hasTitanium = false;
    let hasCopper = false;
    let hasBrass = false;

    for (const label of materialSlugs) {
      // Stainless first so "stainless steel" doesn't double-count as "steel"
      if (label.includes("stainless") || label === "ss" || label.includes("304") || label.includes("316")) {
        hasStainless = true;
        continue;
      }
      if (label.includes("4130") || label.includes("chromoly") || label.includes("chromo")) has4130 = true;
      if (label.includes("alum")) hasAluminum = true;
      if (label.includes("titanium") || label === "ti") hasTitanium = true;
      if (label.includes("copper") || label === "cu") hasCopper = true;
      // Treat "bronze" as part of the Brass bucket (common real-world docs use brass/bronze interchangeably as copper alloys)
      if (label.includes("brass") || label.includes("bronze")) hasBrass = true;
      if (label.includes("mild") || label.includes("carbon steel") || label === "steel" || (label.includes("steel") && !label.includes("stainless"))) {
        hasSteel = true;
      }
    }

    if (rawMaterials.length === 0) {
      materialScore = 0;
      materialReasonPart =
        "No published material compatibility list; materials sub-score is 0.";
    } else {
      const covered: string[] = [];
      if (hasSteel) covered.push("steel");
      if (hasStainless) covered.push("stainless");
      if (has4130) covered.push("4130");
      if (hasAluminum) covered.push("aluminum");
      if (hasTitanium) covered.push("titanium");
      if (hasCopper) covered.push("copper");
      if (hasBrass) covered.push("brass/bronze");

      const coveredCount = covered.length;
      if (coveredCount >= 7) materialScore = 4;
      else if (coveredCount >= 5) materialScore = 3;
      else if (coveredCount >= 3) materialScore = 2;
      else if (coveredCount >= 1) materialScore = 1;
      else materialScore = 0;

      materialReasonPart =
        coveredCount > 0
          ? `Documented materials (${coveredCount}/7): ${covered.join(", ")}.`
          : "Materials list provided but none matched the scored material list (steel, stainless, 4130, aluminum, titanium, copper, brass).";
    }
  } else {
    // No published wall data at the reference size: entire category scores 0.
    thicknessScore = 0;
    materialScore = 0;
    wallReasonPart =
      "No published max wall thickness for 1.75\" OD DOM; this category is scored as 0 rather than guessing.";
  }

  const wallScore = Math.max(0, Math.min(10, thicknessScore + materialScore));

  scoreBreakdown.push({
    criteria: "Stress Capacity & Materials",
    points: wallScore,
    maxPoints: 10,
    reasoning: `${wallReasonPart} ${materialReasonPart}`.trim(),
  });
  totalScore += wallScore;

  // 6. Die Selection & Shapes (8 points)
  //
  // 8 fixed buckets, 1 point each (max 8 pts):
  // - Round tube
  // - Pipe
  // - Square tube
  // - EMT
  // - Metric round
  // - Metric square / rectangular
  // - Plastic / urethane pressure dies
  // - Other documented shapes (e.g. rectangular-only, hex, etc.)
  //
  // Admin stores this as a comma-separated list of labels in `dieShapes`.
  const rawDieShapes = (bender as any).dieShapes;
  let dieTokens: string[] = [];

  if (Array.isArray(rawDieShapes)) {
    dieTokens = rawDieShapes
      .map((s: unknown) => String(s ?? "").trim())
      .filter(Boolean);
  } else if (typeof rawDieShapes === "string") {
    dieTokens = rawDieShapes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const dieSlugs = dieTokens.map((s) => s.toLowerCase());

  const hasRound = dieSlugs.some(
    (s) => s.includes("round") && s.includes("tube"),
  );
  const hasPipe = dieSlugs.some((s) => s.includes("pipe"));
  const hasSquare = dieSlugs.some(
    (s) => s.includes("square") && s.includes("tube"),
  );
  const hasEmt = dieSlugs.some((s) => s.includes("emt"));
  const hasMetricRound = dieSlugs.some(
    (s) =>
      s.includes("metric") &&
      (s.includes("round") || s.includes("od")),
  );
  const hasMetricSquareRect = dieSlugs.some(
    (s) =>
      s.includes("metric") &&
      (s.includes("square") || s.includes("rect")),
  );
  const hasPlastic = dieSlugs.some(
    (s) => s.includes("plastic") || s.includes("urethane"),
  );
  const hasOtherShape = dieSlugs.some(
    (s) =>
      s.includes("other") ||
      s.includes("hex") ||
      (s.includes("rectangular") && !s.includes("tube")),
  );

  let dieScore = 0;
  if (hasRound) dieScore += 1;
  if (hasPipe) dieScore += 1;
  if (hasSquare) dieScore += 1;
  if (hasEmt) dieScore += 1;
  if (hasMetricRound) dieScore += 1;
  if (hasMetricSquareRect) dieScore += 1;
  if (hasPlastic) dieScore += 1;
  if (hasOtherShape) dieScore += 1;

  if (dieScore > 8) dieScore = 8;

  const coveredShapes: string[] = [];
  if (hasRound) coveredShapes.push("round tube");
  if (hasPipe) coveredShapes.push("pipe");
  if (hasSquare) coveredShapes.push("square tube");
  if (hasEmt) coveredShapes.push("EMT");
  if (hasMetricRound) coveredShapes.push("metric round");
  if (hasMetricSquareRect) coveredShapes.push("metric square/rectangular");
  if (hasPlastic) coveredShapes.push("plastic/urethane pressure dies");
  if (hasOtherShape) coveredShapes.push("other documented shapes");

  scoreBreakdown.push({
    criteria: "Die Selection & Shapes",
    points: dieScore,
    maxPoints: 8,
    reasoning:
      coveredShapes.length === 0
        ? "No published/entered die-family coverage for this frame; this category scores 0 rather than guessing."
        : `Documented die coverage for: ${coveredShapes.join(
            ", ",
          )}. Points are awarded only for die families the bender manufacturer explicitly documents as compatible for this frame, including any clearly claimed third-party die ecosystems.`,
  });
  totalScore += dieScore;

  // 7. Track Record (Years in Business) (3 points)
  //
  // Scored ONLY from stated years-in-business when available.
  // If years are missing, this category scores 0 rather than guessing from brand.
  let businessScore = 0;
  const years = (bender as any).yearsInBusiness;
  const yearsNum =
    typeof years === "number"
      ? years
      : (() => {
          const n = parseFloat(String(years ?? "").replace(/[^0-9.+-]/g, ""));
          return Number.isFinite(n) ? n : NaN;
        })();

  // Prefer numeric years when available; otherwise score 0.
  if (Number.isFinite(yearsNum)) {
    if (yearsNum >= 25) businessScore = 3;
    else if (yearsNum >= 10) businessScore = 2;
    else if (yearsNum > 0) businessScore = 1;
    else businessScore = 0;
  } else {
    businessScore = 0;
  }

  scoreBreakdown.push({
    criteria: "Track Record (Years in Business)",
    points: businessScore,
    maxPoints: 3,
    reasoning:
      Number.isFinite(yearsNum) && yearsNum > 0
        ? `Scored from stated years in business: ${yearsNum}.`
        : "No published/entered years-in-business value; this category scores 0 rather than guessing from brand.",
  });
  totalScore += businessScore;

  // 8. Upgrade Path & Modularity (8 points)
  //
  // 8 discrete flags, 1 point each:
  //
  //   A. Power upgrade path (1)
  //      hasPowerUpgradePath
  //
  //   B. LRA control path (4)
  //      hasLengthStop
  //      hasRotationIndexing
  //      hasAngleMeasurement
  //      hasAutoStop
  //
  //   C. Bend-quality tooling upgrades (3)
  //      hasThickWallUpgrade
  //      hasThinWallUpgrade
  //      hasWiperDieSupport
  //
  // Total possible: 8 points.
  const normalizeFlag = (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "yes" || s === "y" || s === "true" || s === "1";
    }
    return false;
  };

  const hasPowerUpgradePath = normalizeFlag(
    (bender as any).hasPowerUpgradePath ?? (bender as any).powerUpgradePath,
  );
  const hasLengthStop = normalizeFlag(
    (bender as any).hasLengthStop ?? (bender as any).lengthStop,
  );
  const hasRotationIndexing = normalizeFlag(
    (bender as any).hasRotationIndexing ?? (bender as any).rotationIndexing,
  );
  const hasAngleMeasurement = normalizeFlag(
    (bender as any).hasAngleMeasurement ?? (bender as any).angleMeasurement,
  );
  const hasAutoStop = normalizeFlag(
    (bender as any).hasAutoStop ?? (bender as any).autoStop,
  );
  const hasThickWallUpgrade = normalizeFlag(
    (bender as any).hasThickWallUpgrade ?? (bender as any).thickWallUpgrade,
  );
  const hasThinWallUpgrade = normalizeFlag(
    (bender as any).hasThinWallUpgrade ?? (bender as any).thinWallUpgrade,
  );
  const hasWiperDieSupport = normalizeFlag(
    (bender as any).hasWiperDieSupport ?? (bender as any).wiperDieSupport,
  );

  let upgradeScore = 0;

  // A. Power upgrade path (1)
  if (hasPowerUpgradePath) upgradeScore += 1;

  // B. LRA control path (4)
  if (hasLengthStop) upgradeScore += 1;
  if (hasRotationIndexing) upgradeScore += 1;
  if (hasAngleMeasurement) upgradeScore += 1;
  if (hasAutoStop) upgradeScore += 1;

  // C. Bend-quality tooling upgrades (3)
  if (hasThickWallUpgrade) upgradeScore += 1;
  if (hasThinWallUpgrade) upgradeScore += 1;
  if (hasWiperDieSupport) upgradeScore += 1;

  if (upgradeScore > 8) upgradeScore = 8;

  const upgradePieces: string[] = [];
  if (hasPowerUpgradePath) upgradePieces.push("power upgrade path");
  if (hasLengthStop) upgradePieces.push("length backstop / stop system");
  if (hasRotationIndexing) upgradePieces.push("rotation indexing for bend-to-bend alignment");
  if (hasAngleMeasurement) upgradePieces.push("built-in or machine-mounted angle readout");
  if (hasAutoStop) upgradePieces.push("auto-stop for bend angle");
  if (hasThickWallUpgrade) upgradePieces.push("thick-wall specific tooling or capacity upgrades");
  if (hasThinWallUpgrade) upgradePieces.push("thin-wall / AL / stainless bend-quality upgrades");
  if (hasWiperDieSupport) upgradePieces.push("support for wiper dies");

  scoreBreakdown.push({
    criteria: "Upgrade Path & Modularity",
    points: upgradeScore,
    maxPoints: 8,
    reasoning:
      upgradePieces.length === 0
        ? "No published/entered upgrade-path data beyond the base configuration for power, LRA control, or bend-quality tooling; this category scores 0 rather than guessing."
        : `Documented upgrade path covering: ${upgradePieces.join(", ")}.`,
  });
  totalScore += upgradeScore;

  // 9. Mandrel Compatibility (4 points)
  //
  // 3-tier mapping (canonical tokens):
  // - "none"    → 0 pts
  // - "economy" → 2 pts (plastic/aluminum/steel or otherwise non-bronze)
  // - "bronze"  → 4 pts (nickel/bronze or equivalent bronze-class system, factory-supported)
  let mandrelScore = 0;
  const mandrelRaw = String(
    (bender as any).mandrel ?? (bender as any).mandrelBender ?? "",
  )
    .trim()
    .toLowerCase();

  if (mandrelRaw === "bronze" || mandrelRaw.includes("bronze") || mandrelRaw.includes("nickel")) {
    mandrelScore = 4;
  } else if (mandrelRaw === "economy") {
    mandrelScore = 2;
  } else {
    mandrelScore = 0;
  }

  let mandrelReason: string;
  if (mandrelScore === 4) {
    mandrelReason =
      "Mandrel bending capability documented by the manufacturer for this frame with a bronze-class mandrel system (e.g., nickel/bronze), or an explicitly equivalent factory-supported system.";
  } else if (mandrelScore === 2) {
    mandrelReason =
      "Economy mandrel option documented by the manufacturer for this frame (non-bronze mandrels such as plastic, aluminum, or steel).";
  } else {
    mandrelReason =
      mandrelRaw.length === 0
        ? "No published/entered mandrel capability data for this frame; this category scores 0 rather than guessing."
        : "Mandrel tier is explicitly none (or not documented clearly enough to score). This category scores 0.";
  }

  scoreBreakdown.push({
    criteria: "Mandrel Compatibility",
    points: mandrelScore,
    maxPoints: 4,
    reasoning: mandrelReason,
  });
  totalScore += mandrelScore;

  // 10. S-Bend Capability (3 points)
  let sBendScore = 0;
  const rawSBend = (bender as any).sBendCapability;
  // Admin UIs often store booleans; "unchecked" can mean either explicit "No" OR simply "not entered".
  // Distinguish using presence of evidence/source fields when available.
  const sbendEvidenceText = [
    (bender as any).sBendCapabilitySource1,
    (bender as any).sBendCapabilitySource2,
    (bender as any).sBendCapabilityNotes,
  ]
    .map((v: unknown) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" | ");
  const hasSBendEvidence = sbendEvidenceText.length > 0;

  let sBendState: "yes" | "no" | "unknown" = "unknown";
  if (typeof rawSBend === "boolean") {
    // If false but no evidence fields exist, treat as unknown (not entered) rather than a hard "No".
    sBendState = rawSBend ? "yes" : (hasSBendEvidence ? "no" : "unknown");
  } else if (typeof rawSBend === "string") {
    const s = rawSBend.trim().toLowerCase();
    if (["yes", "true", "y", "1"].includes(s)) sBendState = "yes";
    else if (["no", "false", "n", "0"].includes(s)) sBendState = hasSBendEvidence ? "no" : "unknown";
    else sBendState = "unknown";
  } else {
    sBendState = "unknown";
  }

  if (sBendState === "yes") sBendScore = 3;

  const sBendReason =
    sBendState === "yes"
      ? "Meets TubeBenderReviews S-bend definition: two opposite-direction bends with ≤0.125\" straight (tangent) between them, verified via specs/photos."
      : sBendState === "no"
      ? "Published/entered data does not qualify under the TubeBenderReviews S-bend definition (≤0.125\" tangent between opposite bends). Marketing \"S-bend\" claims with inches of straight between bends do not qualify."
      : "No published/entered S-bend capability data for this frame; this category scores 0 rather than guessing.";

  scoreBreakdown.push({
    criteria: "S-Bend Capability",
    points: sBendScore,
    maxPoints: 3,
    reasoning: sBendReason,
  });
  totalScore += sBendScore;

  // 11. USA Manufacturing Claim (2 points)
  //
  // Scores ONLY the strength of the manufacturer's own origin CLAIM (the words
  // they use), not the actual origin. The real origin points come from Origin
  // Disclosure (#12).
  //   2 = flat, FTC-unqualified "Made in USA" claim
  //   1 = qualified / loose USA claim ("assembled in USA", "American made", or
  //       "Made in USA" alongside disclosed imported content)
  //   0 = no USA claim (imported, foreign, or silent)
  const usaClaim = parseTier((bender as any).usaClaim, 2);
  scoreBreakdown.push({
    criteria: "USA Manufacturing Claim",
    points: usaClaim,
    maxPoints: 2,
    reasoning:
      usaClaim >= 2
        ? "Manufacturer makes a flat, FTC-unqualified \"Made in USA\" claim (no qualifiers). We score the published claim only — not a legal opinion or factory audit."
        : usaClaim === 1
        ? "Manufacturer makes a qualified/loose USA claim (e.g. \"assembled in USA\", \"American made\", or \"Made in USA\" alongside disclosed imported content)."
        : "No published USA-origin claim (imported, foreign, or silent); this category scores 0.",
  });
  totalScore += usaClaim;

  // 12. Origin Disclosure (8 points) — the "real" USA/origin points.
  //
  // Country-NEUTRAL: rewards documenting where major components come from (USA
  // OR imported both count). For each component the manufacturer publishes a
  // specific origin ("documented") OR the machine simply doesn't have that part
  // ("n/a"), the component earns its weight. Undocumented / blank => 0.
  const DISCLOSURE_COMPONENTS: { key: string; label: string; weight: number }[] = [
    { key: "discloseFrame", label: "frame", weight: 2 },
    { key: "discloseDies", label: "dies/tooling", weight: 2 },
    { key: "discloseHydraulics", label: "hydraulic/power unit", weight: 2 },
    { key: "discloseMotor", label: "pump/motor", weight: 1 },
    { key: "discloseControls", label: "controls/electronics", weight: 1 },
  ];
  let disclosureScore = 0;
  const disclosedParts: string[] = [];
  for (const comp of DISCLOSURE_COMPONENTS) {
    const st = String((bender as any)[comp.key] ?? "").trim().toLowerCase();
    const earns = st.startsWith("documented") || st.startsWith("n/a") || st === "na";
    if (earns) {
      disclosureScore += comp.weight;
      disclosedParts.push(st.startsWith("n") ? `${comp.label} (n/a)` : comp.label);
    }
  }
  scoreBreakdown.push({
    criteria: "Origin Disclosure",
    points: disclosureScore,
    maxPoints: 8,
    reasoning:
      disclosureScore > 0
        ? `Component origin documented for: ${disclosedParts.join(", ")}. Scores disclosure quality only (USA or imported both count); undocumented components score 0.`
        : "No component-level origin documentation published; this category scores 0. We reward disclosing where major parts come from, not any particular country.",
  });
  totalScore += disclosureScore;

  // 13. Single-Source System (2 points, binary)
  //
  // Binary by design:
  // - 2 pts: complete, fully functional system (frame + dies + hydraulics/lever)
  //          available from one primary manufacturer/storefront.
  // - 0 pts: anything else (including “one part sourced elsewhere”).
  const singleSourceTier = parseTier(
    (bender as any).singleSourceSystemTier,
    2,
  );
  const singleSourceScore = singleSourceTier === 2 ? 2 : 0;

  scoreBreakdown.push({
    criteria: "Single-Source System",
    points: singleSourceScore,
    maxPoints: 2,
    reasoning:
      singleSourceScore === 2
        ? "Complete, fully functional system (frame + dies + hydraulics/lever) available from one primary manufacturer/storefront."
        : "No published/entered proof of a complete single-source system for this frame; this category scores 0 rather than guessing.",
  });
  totalScore += singleSourceScore;

  // 14. Warranty Support (3 points)
  //
  // Direct 0–3 mapping from admin tier:
  // 0 = no warranty mentioned / sold as-is
  // 1 = very short or vague coverage
  // 2 = clear 1–2 year coverage
  // 3 = clear multi-year or lifetime frame coverage
  const warrantySupportTier = parseTier((bender as any).warrantyTier, 3);
  let warrantyReason: string;

  if (warrantySupportTier === 3) {
    warrantyReason =
      "Clear multi-year or lifetime coverage on major structural components, based on published warranty terms.";
  } else if (warrantySupportTier === 2) {
    warrantyReason =
      "Clear written warranty with roughly 1–2 years of coverage on the machine or major components.";
  } else if (warrantySupportTier === 1) {
    warrantyReason =
      "Some warranty language present, but short, limited, or vague in duration/coverage.";
  } else {
    warrantyReason =
      "No published/entered written warranty terms for this frame (or sold as-is); this category scores 0 rather than guessing.";
  }

  scoreBreakdown.push({
    criteria: "Warranty (Published Terms Only)",
    points: warrantySupportTier,
    maxPoints: 3,
    reasoning: `${warrantyReason} This category is based strictly on published terms; we do not score how well the warranty is honored in practice.`,
  });
  totalScore += warrantySupportTier;

  // 1. Value for Money (AUTOSCALED, mechanics-only)
  //
  // Raw value = (capabilityPoints / entryPrice)
  // capabilityPoints includes ONLY these categories:
  // 2,3,4,5,6,8,9,10,13,14
  // Excludes: Value itself, USA/origin transparency, years-in-business.
  //
  // Autoscale uses dataset P10/P90 provided by ctx.valueP10/valueP90:
  // - Clamp rawValue into [P10,P90]
  // - Map to points: 1..20 (maxPoints)
  // If entryPrice missing/invalid -> scores 0 (no guessing).
  const maxValuePoints = 20;
  const minValuePoints = 1;

  const findPts = (name: string): number => {
    const it = scoreBreakdown.find((x) => x.criteria === name);
    return it ? it.points : 0;
  };

  const capabilityPoints =
    findPts("Ease of Use & Setup") +
    findPts("Max Diameter & CLR Capability") +
    findPts("Bend Angle Capability") +
    findPts("Stress Capacity & Materials") +
    findPts("Die Selection & Shapes") +
    findPts("Upgrade Path & Modularity") +
    findPts("Mandrel Compatibility") +
    findPts("S-Bend Capability") +
    findPts("Single-Source System") +
    findPts("Warranty (Published Terms Only)");

  let valueReason: string;
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    valueScore = 0;
    valueReason =
      "No documented starter-system pricing (entryPrice) available (frame + dies + power + stand). This category scores 0 rather than guessing.";
  } else {
    const rawValue = capabilityPoints / entryPrice;
    const p10 = Number(ctx?.valueP10 ?? NaN);
    const p90 = Number(ctx?.valueP90 ?? NaN);

    if (Number.isFinite(p10) && Number.isFinite(p90) && p90 > p10) {
      valueScore = lerpPointsClamped(rawValue, p10, p90, minValuePoints, maxValuePoints);
      valueReason =
        `Autoscaled mechanics-only value using rawValue=(capabilityPoints/entryPrice). ` +
        `capabilityPoints=${capabilityPoints}, entryPrice=${entryPrice.toFixed(0)}, rawValue=${rawValue.toExponential(3)}. ` +
        `Dataset band: P10=${p10.toExponential(3)}, P90=${p90.toExponential(3)}. ` +
        `Values are clamped into [P10,P90] and mapped to ${minValuePoints}..${maxValuePoints}.`;
    } else {
      // Backward-compatible fallback: simple entryPrice tiers (still evidence-based).
      if (entryPrice <= 1500) valueScore = 20;
      else if (entryPrice <= 2000) valueScore = 18;
      else if (entryPrice <= 3000) valueScore = 15;
      else if (entryPrice <= 4500) valueScore = 12;
      else if (entryPrice <= 6500) valueScore = 9;
      else valueScore = 7;

      valueReason =
        `Autoscale band missing (ctx.valueP10/valueP90). Falling back to legacy entryPrice tiering using entryPrice=${entryPrice.toFixed(
          0,
        )}.`;
    }
  }

  // Overwrite the placeholder Value breakdown item (index 0).
  scoreBreakdown[0] = {
    criteria: "Value for Money",
    points: valueScore,
    maxPoints: maxValuePoints,
    reasoning: valueReason,
  };

  totalScore += valueScore;

  return {
    totalScore,
    scoreBreakdown,
  };
}
