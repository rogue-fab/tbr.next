// lib/scoringExplainers.ts
//
// Shared, reader-facing "how this category is scored" one-liners, keyed by the
// stable SCORING_CATEGORIES key. Used on the review page so every score sits
// right next to its method (and its citations). Keep these in sync with the
// full rules on /scoring — same information, compact form.

// Full, self-contained, reproducible rules for each category — every tier and
// how each point is earned, so a reader can recompute the score by hand.
export const SCORING_EXPLAINERS: Record<string, string> = {
  valueForMoney:
    "Value = capability points earned (of 67 possible — the sum of the 10 capability categories below) ÷ the complete-system price, expressed per $1,000, on a fixed published scale: ≥30 per $1k → 20 pts · 25–29 → 17 · 20–24 → 14 · 15–19 → 11 · 12–14 → 8 · 9–11 → 5 · 6–8 → 3 · under 6 → 1 · no documented price → 0. The scale is fixed, so a score never shifts when other machines change.",
  easeOfUseSetup:
    "Two parts, capped at 10. PORTABILITY (0–3): rolling as standard = 3 · portable with a rolling option = 2 · portable = 1 · fixed/bolt-down = 0. EVIDENCE CHECKLIST (0–7): +1 each for a downloadable manual, on-machine operating instructions, a built-in bend-angle reference, an angle stop, a real rotation aid (clamp-on analog/digital or chuck/indexer — a magnet-on-tube or none scores 0), a documented quick-die-change aid, and official YouTube content for this exact model.",
  maxDiameterRadius:
    "Largest round-tube OD the machine runs with catalog tooling, on fixed tiers: ≥2.5\" = 10 · ≥2.375\" = 9 · ≥2.25\" = 8 · ≥2.0\" = 7 · ≥1.75\" = 5 · ≥1.5\" = 3 · any smaller documented size = 2 · no published OD = 0. (CLR is shown for reference but not scored.)",
  bendAngleCapability:
    "Maximum published bend angle, on fixed tiers: ≥190° = 9 · ≥180° = 7 · ≥120° = 4 · any smaller documented angle = 2 · no published angle = 0.",
  wallThicknessCapability:
    "Two parts, capped at 10; if no wall spec for 1.75\" OD DOM is published the WHOLE category is 0 (no inferring strength). WALL THICKNESS (0–6): ≥0.875\" (solid bar) = 6 · ≥0.250\" = 5 · ≥0.188\" = 4 · ≥0.156\" = 3 · ≥0.120\" = 2 · ≥0.095\" = 1. MATERIALS (0–4): count of documented materials from steel, stainless, 4130, aluminum, titanium, copper, brass — 7 = 4 · 5–6 = 3 · 3–4 = 2 · 1–2 = 1 · 0 = 0.",
  dieSelectionShapes:
    "+1 point for each die family the maker documents for this frame (8 max): round tube, pipe, square tube, EMT, metric round, metric square, plastic/urethane pressure dies, and any other clearly documented shape.",
  yearsInBusiness:
    "Documented years the brand has operated: ≥25 yrs = 3 · ≥10 = 2 · >0 = 1 · no founding date published = 0.",
  upgradePathModularity:
    "+1 point for each documented, factory-supported upgrade (8 max): power upgrade path, length/back stop, rotation indexing, angle measurement, auto-stop, thick-wall tooling, thin-wall/quality tooling, and wiper-die support.",
  mandrelCompatibility:
    "Documented mandrel support for this specific frame: bronze/nickel-class system = 4 · economy (plastic/aluminum/steel) mandrel = 2 · none or not documented = 0. No guessing.",
  sBendCapability:
    "A true S-bend — two opposite-direction bends with ≤0.125\" straight (tangent) between them, proven by specs, photos, or repeatable test pieces: yes = 3 · otherwise (or marketing 'S-bends' with inches of straight) = 0.",
  usaManufacturingClaim:
    "Scores the maker's own origin CLAIM only (not verified origin): a flat, FTC-unqualified \"Made in USA\" = 2 · a qualified/loose claim (\"assembled in USA\", \"American made\", or \"Made in USA\" with imported parts disclosed) = 1 · no USA claim = 0.",
  originDisclosure:
    "+1 per major component whose specific origin the maker documents — USA or imported both count (we reward disclosure, not country): frame +2, dies/tooling +2, hydraulic/power unit +2, pump/motor +1, controls/electronics +1 (8 max). A part the machine doesn't have (e.g. no hydraulics on a manual bender) isn't counted against it.",
  singleSourceSystem:
    "Can a normal buyer get a complete, working system — frame + dies + the required power/lever — from one primary manufacturer/storefront? Yes = 2 · anything requiring you to source a major part elsewhere = 0.",
  warrantySupport:
    "Strength of the published written warranty only: strong/lifetime on the frame or ≥3-yr comprehensive = 3 · a clear 1–2-yr warranty = 2 · a short or heavily limited but documented warranty = 1 · none, as-is, or not mentioned = 0.",
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
