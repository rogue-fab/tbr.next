// lib/scoringExplainers.ts
//
// Shared, reader-facing "how this category is scored" one-liners, keyed by the
// stable SCORING_CATEGORIES key. Used on the review page so every score sits
// right next to its method (and its citations). Keep these in sync with the
// full rules on /scoring — same information, compact form.

export const SCORING_EXPLAINERS: Record<string, string> = {
  valueForMoney:
    "Capability points earned (of 67 possible) ÷ the complete-system price, expressed per $1,000, on a fixed published scale. More real ability per dollar = more points.",
  easeOfUseSetup:
    "Portability (0–3) plus a 7-point evidence checklist: downloadable manual, on-machine instructions, built-in angle reference, angle stop, a real rotation aid, quick die change, and official model-specific video.",
  maxDiameterRadius:
    "Largest round-tube OD the machine runs with catalog tooling, on fixed tiers (≥2.5\"=10, down to >0\"=2). No published OD = 0.",
  bendAngleCapability:
    "Maximum published bend angle, on fixed tiers (≥195°=9, ≥180°=7, ≥120°=4, >0°=2). No published angle = 0.",
  wallThicknessCapability:
    "Max wall thickness for 1.75\" OD DOM (0–6) plus a count of documented compatible materials (0–4). No published wall spec scores the whole category 0.",
  dieSelectionShapes:
    "One point each for documented die families: round tube, pipe, square, EMT, metric round, metric square, plastic/urethane, and other (8 max).",
  yearsInBusiness:
    "Documented years the brand has operated: ≥25 yrs=3, ≥10=2, >0=1. No founding date published = 0.",
  upgradePathModularity:
    "One point each for a documented upgrade: power path, length stop, rotation indexing, angle readout, auto-stop, thick-wall tooling, thin-wall tooling, wiper-die support (8 max).",
  mandrelCompatibility:
    "Documented mandrel support for this frame: bronze/nickel-class=4, economy=2, none=0. No guesses.",
  sBendCapability:
    "A true S-bend — two opposite bends with ≤0.125\" straight between them, proven by specs/photos: yes=3, otherwise 0.",
  usaManufacturingClaim:
    "The strength of the maker's own origin claim only: flat FTC-unqualified \"Made in USA\"=2, a qualified/loose claim=1, none=0.",
  originDisclosure:
    "One point per major component whose specific origin the maker documents — USA or imported both count: frame +2, dies +2, hydraulic/power +2, motor +1, controls +1 (8 max).",
  singleSourceSystem:
    "Can a buyer get a complete, working system (frame + dies + power) from one primary storefront? Yes=2, otherwise 0.",
  warrantySupport:
    "Strength of the published written warranty: strong/lifetime=3, standard 1–2 yr=2, short/limited=1, none or as-is=0.",
};

/**
 * Which admin data fields feed each scoring category. Used to gather the
 * citations (the <field>Source1 / Source2 / Notes / UserCode entries) that back
 * a category's score, so proof shows up right under the number.
 */
export const CATEGORY_CITATION_FIELDS: Record<string, string[]> = {
  valueForMoney: [
    "framePriceMin", "framePriceMax", "diePriceMin", "diePriceMax",
    "hydraulicPriceMin", "hydraulicPriceMax", "standPriceMin", "standPriceMax",
  ],
  easeOfUseSetup: [
    "portability", "hasManual", "hasOnMachineInstructions", "hasAngleReference",
    "hasAngleStop", "rotationAid", "quickDieChange", "hasMfrYoutubeModelContent",
  ],
  maxDiameterRadius: ["maxCapacity"],
  bendAngleCapability: ["bendAngle"],
  wallThicknessCapability: ["wallThicknessCapacity", "materials"],
  dieSelectionShapes: ["dieShapes"],
  yearsInBusiness: ["yearsInBusiness"],
  upgradePathModularity: [
    "hasPowerUpgradePath", "lengthStop", "rotationIndexing", "angleMeasurement",
    "autoStop", "thickWallUpgrade", "thinWallUpgrade", "wiperDieSupport",
  ],
  mandrelCompatibility: ["mandrel"],
  sBendCapability: ["sBendCapability"],
  usaManufacturingClaim: ["usaClaim"],
  originDisclosure: [
    "discloseFrame", "discloseDies", "discloseHydraulics", "discloseMotor", "discloseControls",
  ],
  singleSourceSystem: ["singleSourceSystemTier"],
  warrantySupport: ["warrantyTier"],
};

/** Compact, reader-facing labels for the citation fields. Falls back to the key. */
export const CITATION_FIELD_LABELS: Record<string, string> = {
  framePriceMin: "Frame price (min)", framePriceMax: "Frame price (max)",
  diePriceMin: "Die price (min)", diePriceMax: "Die price (max)",
  hydraulicPriceMin: "Hydraulics price (min)", hydraulicPriceMax: "Hydraulics price (max)",
  standPriceMin: "Stand price (min)", standPriceMax: "Stand price (max)",
  portability: "Portability", hasManual: "Manual available",
  hasOnMachineInstructions: "On-machine instructions", hasAngleReference: "Angle reference",
  hasAngleStop: "Angle stop", rotationAid: "Rotation aid", quickDieChange: "Quick die change",
  hasMfrYoutubeModelContent: "Official model video",
  maxCapacity: "Max diameter (OD)", bendAngle: "Max bend angle",
  wallThicknessCapacity: "Wall thickness (1.75\" DOM)", materials: "Materials compatibility",
  dieShapes: "Die shapes", yearsInBusiness: "Years in business",
  hasPowerUpgradePath: "Power upgrade path", lengthStop: "Length stop",
  rotationIndexing: "Rotation indexing", angleMeasurement: "Angle measurement",
  autoStop: "Auto stop", thickWallUpgrade: "Thick-wall tooling",
  thinWallUpgrade: "Thin-wall tooling", wiperDieSupport: "Wiper die support",
  mandrel: "Mandrel option", sBendCapability: "S-bend capability",
  usaClaim: "USA manufacturing claim", discloseFrame: "Frame origin",
  discloseDies: "Dies origin", discloseHydraulics: "Hydraulic/power origin",
  discloseMotor: "Pump/motor origin", discloseControls: "Controls origin",
  singleSourceSystemTier: "Single-source system", warrantyTier: "Warranty",
};
