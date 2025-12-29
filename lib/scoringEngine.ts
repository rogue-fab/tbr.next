/**
 * Legacy, but fully transparent, tube-bender scoring engine.
 *
 * This is a direct adaptation of the original Replit-era algorithm, rewritten
 * to be self-contained and defensive. It does NOT depend on any shared schema
 * or database models – it operates on a generic "product-like" shape.
 *
 * Integration into the current catalog happens via adapter code elsewhere.
 */

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
  /**
   * Portability / how the machine lives in the shop.
   *
   * Expected normalized values:
   * - "fixed"                        → 0  (must be anchored / immovable for use)
   * - "portable"                     → 1  (self-contained & movable, no rolling option)
   * - "portable_with_rolling_option" → 2  (portable, with a documented cart / rolling upgrade)
   * - "rolling" or "rolling_standard"→ 3  (ships on wheels / designed to roll around the shop)
   *
   * Anything else is treated conservatively as 0 until the admin overlay is wired up.
   */
  portability?: string;
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
export function calculateTubeBenderScore(bender: ScoringInput): ScoredResult {
  const scoreBreakdown: ScoreBreakdownItem[] = [];
  let totalScore = 0;

  // 1. Value for Money (legacy stub; real value is layered in getProductScore)
  let valueScore = 0;
  const entryPrice = typeof (bender as any).entryPrice === "number" ? (bender as any).entryPrice : NaN;

  // Prefer numeric entryPrice (from getProductScore) when present.
  // This keeps the category alive even if priceRange is empty.
  if (Number.isFinite(entryPrice) && entryPrice > 0) {
    // Simple numeric tiers (defensive / not pretending to be "perfect math").
    // You can refine these bands later without breaking wiring.
    if (entryPrice <= 1500) valueScore = 20;
    else if (entryPrice <= 2000) valueScore = 18;
    else if (entryPrice <= 3000) valueScore = 15;
    else if (entryPrice <= 4500) valueScore = 12;
    else if (entryPrice <= 6500) valueScore = 9;
    else valueScore = 7;
  } else {
    // No documented entryPrice available: score 0 rather than guessing.
    valueScore = 0;
  }

  scoreBreakdown.push({
    criteria: "Value for Money",
    points: valueScore,
    maxPoints: 20,
    reasoning:
      Number.isFinite(entryPrice) && entryPrice > 0
        ? `Numeric entryPrice tiering using ${entryPrice.toFixed(
            0,
          )} as the starter-system price (frame + dies + power + stand) from getProductScore.`
        : `No documented starter-system pricing (entryPrice) available (frame + dies + power + stand). This category scores 0 rather than guessing.`,
  });
  totalScore += valueScore;

  // 2. Ease of Use & Setup (11 points)
  //
  // This combines:
  // - A base ergonomics/operation score (7–11 pts) driven by legacy
  //   brand/power-type heuristics.
  // - A portability tier (0–3 pts) from the admin "portability" field:
  //     0 = fixed base only
  //     1 = portable, no rolling option
  //     2 = portable with optional rolling base/cart
  //     3 = rolling base as a standard feature
  //
  // The final category score is clamped to 11/11.
  const brand = String(bender.brand ?? "");
  const powerType = String(bender.powerType ?? "");

  let easeBase = 0;
  if (brand === "RogueFab") easeBase = 11;
  else if (brand === "SWAG Off Road") easeBase = 10;
  else if (brand === "JD2") easeBase = 9;
  else if (powerType.toLowerCase().includes("manual")) easeBase = 8;
  else if (powerType.toLowerCase().includes("hydraulic")) easeBase = 9;
  else easeBase = 7;

  const portabilityRaw = String(
    (bender as any).portability ?? (bender as any).mobility ?? "",
  )
    .trim()
    .toLowerCase();

  let portabilityScore = 0;
  let portabilityLabel = "fixed base / no portability data";

  if (portabilityRaw) {
    if (
      portabilityRaw.includes("rolling") &&
      (portabilityRaw.includes("standard") ||
        portabilityRaw.includes("included") ||
        portabilityRaw.includes("built-in"))
    ) {
      portabilityScore = 3;
      portabilityLabel = "rolling base as a standard feature";
    } else if (
      portabilityRaw.includes("rolling") ||
      portabilityRaw.includes("cart")
    ) {
      portabilityScore = 2;
      portabilityLabel = "portable with optional rolling base/cart";
    } else if (portabilityRaw.includes("portable")) {
      portabilityScore = 1;
      portabilityLabel = "portable (no rolling option)";
    } else if (
      portabilityRaw.includes("fixed") ||
      portabilityRaw.includes("floor") ||
      portabilityRaw.includes("bench")
    ) {
      portabilityScore = 0;
      portabilityLabel = "fixed base that must be mounted to use";
    } else {
      portabilityScore = 0;
      portabilityLabel =
        "unspecified portability; treated as fixed for scoring purposes";
    }
  }

  let easeScore = easeBase + portabilityScore;
  if (easeScore > 11) easeScore = 11;

  scoreBreakdown.push({
    criteria: "Ease of Use & Setup",
    points: easeScore,
    maxPoints: 11,
    reasoning: `${powerType || "Unknown power type"} operation with ${
      brand || "unknown brand"
    } ergonomics (base score ${easeBase}/11) and portability tier: ${portabilityLabel} (+${portabilityScore} pts).`,
  });
  totalScore += easeScore;

  // 3. Max Diameter & CLR Capability (10 points)
  //
  // NOTE: As of now this category scores *only* maximum round tube OD based on
  // published specs. CLR is not yet wired into the numeric score because CLR
  // data is not standardized across all machines. The /scoring page copy is
  // explicit about this so we are not pretending to use CLR in the math before
  // the data exists; CLR ranges will be added once we have consistent data for
  // every machine in the comparison.
  let capacityScore = 0;
  const maxCapacityRaw = bender.maxCapacity;
  const maxCapacityText = String(maxCapacityRaw ?? "").toLowerCase().trim();

  // Prefer numeric tiering when input is a clean number (fixes "2" scoring)
  const maxCapacityNum =
    typeof maxCapacityRaw === "number"
      ? maxCapacityRaw
      : (() => {
          const n = parseFloat(maxCapacityText.replace(/[^0-9.+-]/g, ""));
          return Number.isFinite(n) ? n : NaN;
        })();

  if (Number.isFinite(maxCapacityNum)) {
    const n = maxCapacityNum;
    if (n >= 2.5) capacityScore = 10;
    else if (n >= 2.375) capacityScore = 9;
    else if (n >= 2.25) capacityScore = 8;
    else if (n >= 2.0) capacityScore = 7;
    else if (n >= 1.75) capacityScore = 5;
    else if (n >= 1.5) capacityScore = 3;
    else if (n > 0) capacityScore = 2;
  } else if (maxCapacityText) {
    // Legacy string matching (kept for fractions like "2-1/4")
    if (maxCapacityText.includes("2.5") || maxCapacityText.includes("2-1/2")) capacityScore = 10;
    else if (maxCapacityText.includes("2-3/8") || maxCapacityText.includes("2.375")) capacityScore = 9;
    else if (maxCapacityText.includes("2.25") || maxCapacityText.includes("2-1/4")) capacityScore = 8;
    else if (maxCapacityText.includes("2.0") || maxCapacityText.includes('2"')) capacityScore = 7;
    else if (maxCapacityText.includes("1.75") || maxCapacityText.includes("1-3/4")) capacityScore = 5;
    else if (maxCapacityText.includes("1.5") || maxCapacityText.includes("1-1/2")) capacityScore = 3;
    else capacityScore = 2;
  }

  scoreBreakdown.push({
    criteria: "Max Diameter & CLR Capability",
    points: capacityScore,
    maxPoints: 10,
    reasoning: `${
      bender.maxCapacity ?? "Unknown"
    } maximum round tube capacity based on published specs. Math today is OD-only; CLR ranges will be added to the score once consistent CLR data is available for all machines.`,
  });
  totalScore += capacityScore;

  // 4. Bend Angle Capability (9 points)
  //
  // Explicit tiers:
  // - ≥ 195° → 9 pts
  // - 180–194° → 7 pts
  // - 120–179° → 4 pts
  // - < 120° → 2 pts
  // - no published angle → 0 pts
  let angleScore = 0;
  const bendAngle =
    typeof bender.bendAngle === "number"
      ? bender.bendAngle
      : typeof (bender as any).maxBendAngle === "number"
      ? (bender as any).maxBendAngle
      : NaN;
  if (!Number.isNaN(bendAngle)) {
    if (bendAngle >= 195) angleScore = 9;
    else if (bendAngle >= 180) angleScore = 7;
    else if (bendAngle >= 120) angleScore = 4;
    else angleScore = 2;
  }

  scoreBreakdown.push({
    criteria: "Bend Angle Capability",
    points: angleScore,
    maxPoints: 9,
    reasoning: Number.isNaN(bendAngle) ? "No published bend angle" : `${bendAngle}° maximum bend angle`,
  });
  totalScore += angleScore;

  // 5. Wall Thickness Capability (9 points)
  //
  // This combines:
  // - Thickness: 0–6 points based on the thickest published 1.75" OD DOM wall.
  // - Materials: 0–3 points based on documented material compatibility.
  //
  // If there is no published max wall for 1.75" OD, we do NOT fabricate data:
  // the entire category is scored as 0 and the reasoning says so.
  let thicknessScore = 0;
  let materialScore = 0;
  const wallRaw = bender.wallThicknessCapacity;
  let wallReasonPart: string;
  let materialReasonPart = "";

  if (wallRaw !== undefined && wallRaw !== null && wallRaw !== "") {
    const thickness = parseFloat(String(wallRaw));
    if (Number.isFinite(thickness)) {
      if (thickness >= 0.156) thicknessScore = 6;
      else if (thickness >= 0.120) thicknessScore = 5;
      else if (thickness >= 0.095) thicknessScore = 4;
      else if (thickness > 0) thicknessScore = 3;
      wallReasonPart = `${wallRaw}" wall capacity for 1.75" OD DOM.`;
    } else {
      thicknessScore = 0;
      wallReasonPart = `Unparseable wall thickness value: ${String(wallRaw)}.`;
    }

    // Materials scoring (0–3 points)
    const rawMaterials = Array.isArray(bender.materials)
      ? (bender.materials as unknown[])
      : [];

    const materialSlugs = rawMaterials
      .map((m) => String(m || "").trim().toLowerCase())
      .filter(Boolean);

    let hasMild = false;
    let has4130 = false;
    let hasStainless = false;
    let hasAluminum = false;
    let hasTitanium = false;
    let hasCopperBrass = false;
    let hasOtherMat = false;

    for (const label of materialSlugs) {
      if (label.includes("mild")) hasMild = true;
      if (label.includes("4130") || label.includes("chromoly")) has4130 = true;
      if (
        label.includes("stainless") ||
        label.includes("304") ||
        label.includes("316")
      )
        hasStainless = true;
      if (label.includes("alum")) hasAluminum = true;
      if (label.includes("titanium") || label === "ti") hasTitanium = true;
      if (
        label.includes("copper") ||
        label.includes("brass") ||
        label.includes("bronze")
      )
        hasCopperBrass = true;
      if (
        !label.includes("mild") &&
        !label.includes("4130") &&
        !label.includes("chromoly") &&
        !label.includes("stainless") &&
        !label.includes("304") &&
        !label.includes("316") &&
        !label.includes("alum") &&
        !label.includes("titanium") &&
        label !== "ti" &&
        !label.includes("copper") &&
        !label.includes("brass") &&
        !label.includes("bronze")
      ) {
        hasOtherMat = true;
      }
    }

    let rawMaterialWeight = 0;
    if (hasMild) rawMaterialWeight += 2;
    if (has4130) rawMaterialWeight += 2;
    if (hasStainless) rawMaterialWeight += 1.5;
    if (hasAluminum) rawMaterialWeight += 1.5;
    if (hasTitanium) rawMaterialWeight += 1;
    if (hasCopperBrass) rawMaterialWeight += 1;
    if (hasOtherMat) rawMaterialWeight += 1;

    if (rawMaterials.length === 0) {
      materialScore = 0;
      materialReasonPart =
        "No published material compatibility list; material coverage not scored.";
    } else {
      const maxRawMaterialWeight = 2 + 2 + 1.5 + 1.5 + 1 + 1 + 1; // 10
      const normalised =
        maxRawMaterialWeight > 0
          ? (3 * rawMaterialWeight) / maxRawMaterialWeight
          : 0;
      materialScore = Math.round(
        Math.max(0, Math.min(3, normalised)),
      );

      const matLabels: string[] = [];
      if (hasMild) matLabels.push("mild steel");
      if (has4130) matLabels.push("4130 chromoly");
      if (hasStainless) matLabels.push("stainless (304/316)");
      if (hasAluminum) matLabels.push("aluminum");
      if (hasTitanium) matLabels.push("titanium");
      if (hasCopperBrass) matLabels.push("copper/brass/bronze");
      if (hasOtherMat) matLabels.push("other documented alloys");

      materialReasonPart =
        matLabels.length > 0
          ? `Documented material coverage includes: ${matLabels.join(", ")}.`
          : "Materials list provided but could not be mapped to known categories.";
    }
  } else {
    // No published wall data at the reference size: entire category scores 0.
    thicknessScore = 0;
    materialScore = 0;
    wallReasonPart =
      "No published max wall thickness for 1.75\" OD DOM; this category is scored as 0 rather than guessing.";
  }

  const wallScore = Math.max(
    0,
    Math.min(9, thicknessScore + materialScore),
  );

  scoreBreakdown.push({
    criteria: "Wall Thickness Capability",
    points: wallScore,
    maxPoints: 9,
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
        ? "No documented tube/pipe die families beyond basic or unspecified coverage."
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
        ? "No documented upgrade path beyond the base configuration for power, LRA control, or bend-quality tooling."
        : `Documented upgrade path covering: ${upgradePieces.join(", ")}.`,
  });
  totalScore += upgradeScore;

  // 9. Mandrel Compatibility (4 points)
  //
  // 3-tier mapping:
  // - 0 pts: none
  // - 2 pts: "economy" mandrels (non-bronze, plastic/steel, etc.)
  // - 4 pts: bronze / full mandrel system ("bronze")
  let mandrelScore = 0;
  const mandrelRaw = String(
    (bender as any).mandrel ?? (bender as any).mandrelBender ?? "",
  )
    .trim()
    .toLowerCase();

  if (mandrelRaw === "bronze") {
    mandrelScore = 4;
  } else if (mandrelRaw === "economy") {
    mandrelScore = 2;
  }

  let mandrelReason: string;
  if (mandrelScore === 4) {
    mandrelReason =
      "Mandrel bending capability documented by the manufacturer for this frame with a full bronze or equivalent mandrel system.";
  } else if (mandrelScore === 2) {
    mandrelReason =
      "Economy mandrel option documented by the manufacturer for this frame (non-bronze mandrels such as plastic, aluminum, or steel).";
  } else {
    mandrelReason = "No documented mandrel capability for this frame.";
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
  const sBendCapability =
    typeof rawSBend === "boolean"
      ? rawSBend
      : typeof rawSBend === "string"
      ? ["yes", "true"].includes(rawSBend.trim().toLowerCase())
      : false;

  if (sBendCapability === true) sBendScore = 3;

  scoreBreakdown.push({
    criteria: "S-Bend Capability",
    points: sBendScore,
    maxPoints: 3,
    reasoning: sBendCapability
      ? "Meets TubeBenderReviews S-bend definition: two opposite-direction bends with ≤0.125\" straight (tangent) between them, verified via specs/photos."
      : "No documented ability to form back-to-back opposite bends with ≤0.125\" tangent; marketing \"S-bend\" claims with several inches of straight between bends do not qualify.",
  });
  totalScore += sBendScore;

  // 11. USA Manufacturing (Disclosure-Based) (5 points)
  //
  // Tier meaning is defined on the /scoring page; this function only converts
  // the admin-entered tier (0–5) into points and documents that it's
  // disclosure-based, not a legal opinion on FTC compliance.
  const usaManufacturingDisclosure = parseTier(
    (bender as any).usaManufacturingTier,
    5,
  );
  scoreBreakdown.push({
    criteria: "USA Manufacturing (Disclosure-Based)",
    points: usaManufacturingDisclosure,
    maxPoints: 5,
    reasoning:
      usaManufacturingDisclosure > 0
        ? `Disclosure-based tier ${usaManufacturingDisclosure}/5 based solely on the manufacturer's own claims about where frames, dies, hydraulics, and assembly occur. We do not audit factories or offer legal opinions on FTC compliance; this scores the stated claim only.`
        : "No disclosed USA manufacturing claims, clearly imported origin, or only very weak USA-flavored language.",
  });
  totalScore += usaManufacturingDisclosure;

  // 12. Origin Transparency (5 points)
  const originTransparencyTier = parseTier(
    (bender as any).originTransparencyTier,
    5,
  );
  scoreBreakdown.push({
    criteria: "Origin Transparency",
    points: originTransparencyTier,
    maxPoints: 5,
    reasoning:
      originTransparencyTier > 0
        ? `Transparency tier ${originTransparencyTier}/5 based on how clearly the manufacturer documents the origin of major components. This scores documentation quality only; it does not reward or penalize any specific country of origin.`
        : "No meaningful origin disclosure, or only vague/marketing language without concrete component origin details.",
  });
  totalScore += originTransparencyTier;

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
        : "One or more required components must be sourced elsewhere, or the manufacturer does not clearly offer a complete system from a single source.",
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
      "No meaningful written warranty, sold as-is, or warranty not mentioned in published documentation.";
  }

  scoreBreakdown.push({
    criteria: "Warranty (Published Terms Only)",
    points: warrantySupportTier,
    maxPoints: 3,
    reasoning: `${warrantyReason} This category is based strictly on published terms; we do not score how well the warranty is honored in practice.`,
  });
  totalScore += warrantySupportTier;

  return {
    totalScore,
    scoreBreakdown,
  };
}
