/**
 * Mechanically generated Pros/Cons (facts + dataset rank).
 */

/**
 * Auto-generated pro/con item.
 *
 * NOTE: This is intentionally permissive because the generator may evolve
 * without needing to thread new fields through a strict type.
 * This file previously referenced AutoItem without defining it, which breaks
 * Vercel type-checking.
 */
type AutoItem = {
  text: string;
  sources?: string[]; // optional citations / source notes
  [key: string]: unknown; // allow future fields without breaking builds
};

/**
 * Design goals:
 * - Autoscale-proof: do NOT rely on scoring points; rely on normalized facts + rank.
 * - FTC-safe: no opinions, no adjectives, no brand/reputation inference.
 * - Admin control: allow hiding individual generated items via ID lists.
 *   Fields expected on the product (overlay-friendly):
 *     - hiddenAutoPros: string[] or CSV string
 *     - hiddenAutoCons: string[] or CSV string
 *   Default is ON: new items appear unless explicitly hidden.
 */

export type AutoProCon = {
  type: "pro" | "con";
  text: string;
  enabled: boolean;
};

type AnyProduct = Record<string, any>;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).trim().replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function firstNumberish(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = toNum(v);
    if (n !== null) return n;
  }
  return null;
}

function parseHiddenList(v: unknown): Set<string> {
  if (Array.isArray(v)) {
    return new Set(v.map((s) => String(s ?? "").trim()).filter(Boolean));
  }
  if (typeof v === "string") {
    return new Set(
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return new Set();
}

function moneyOrNull(raw: unknown): number | null {
  return toNum(raw);
}

function computeEntryPrice(p: AnyProduct): number | null {
  // Mirror scoring.ts intent: starter system = frame + die + hydraulic + stand (min preferred).
  const frameMin = moneyOrNull(p.framePriceMin);
  const dieMin = moneyOrNull(p.diePriceMin);
  const hydraulicMin = moneyOrNull(p.hydraulicPriceMin);
  const standMin = moneyOrNull(p.standPriceMin);

  const frameMax = moneyOrNull(p.framePriceMax);
  const dieMax = moneyOrNull(p.diePriceMax);
  const hydraulicMax = moneyOrNull(p.hydraulicPriceMax);
  const standMax = moneyOrNull(p.standPriceMax);

  const hasMin =
    frameMin !== null || dieMin !== null || hydraulicMin !== null || standMin !== null;
  const hasMax =
    frameMax !== null || dieMax !== null || hydraulicMax !== null || standMax !== null;

  const minTotal = hasMin
    ? (frameMin ?? 0) + (dieMin ?? 0) + (hydraulicMin ?? 0) + (standMin ?? 0)
    : null;

  const maxTotal = hasMax
    ? (frameMax ?? 0) + (dieMax ?? 0) + (hydraulicMax ?? 0) + (standMax ?? 0)
    : null;

  // Prefer conservative minimum system. If missing, fall back to maximum system, then catalog price.
  if (minTotal !== null && minTotal > 0) return minTotal;
  if (maxTotal !== null && maxTotal > 0) return maxTotal;
  const price = moneyOrNull(p.price);
  if (price !== null && price > 0) return price;
  return null;
}

function computeMaxOdIn(p: AnyProduct): number | null {
  // Prefer maxCapacity (admin overlay), then capacity, then max_od.
  return firstNumberish(p.maxCapacity, p.capacity, p.max_od, p.maxTubeOD, p.maxOdIn);
}

function computeMaxBendAngleDeg(p: AnyProduct): number | null {
  return firstNumberish(p.maxBendAngle, p.bendAngle, p.maxBendAngleDeg);
}

function computeWallAt175In(p: AnyProduct): number | null {
  return firstNumberish(p.wallThicknessCapacity, p.maxWall175Dom, p.maxWallAt175, p.maxWall);
}

const MATERIAL_KEYS = [
  "Mild steel",
  "Stainless steel",
  "4130 chromoly",
  "Aluminum",
  "Titanium",
  "Copper",
  "Brass",
] as const;

function computeMaterialCount(p: AnyProduct): number {
  const raw = p.materials;
  let tokens: string[] = [];

  if (Array.isArray(raw)) {
    tokens = raw.map((s: any) => String(s ?? "").trim()).filter(Boolean);
  } else if (typeof raw === "string") {
    tokens = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    tokens = [];
  }

  const set = new Set<string>();
  for (const t of tokens) {
    // Only count materials from the canonical list.
    if ((MATERIAL_KEYS as readonly string[]).includes(t)) set.add(t);
  }
  return set.size;
}

function materialTierFromCount(count: number): number {
  // 0 = not listed, 1 = 1+, 2 = 3+, 3 = 5+, 4 = 7+ (full list)
  if (count >= 7) return 4;
  if (count >= 5) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

function normalizeMandrelTier(p: AnyProduct): "none" | "economy" | "bronze" {
  const s = String(p.mandrel ?? p.mandrelBender ?? "").trim().toLowerCase();
  if (!s) return "none";
  if (s === "none" || s === "no" || s === "not available" || s === "n/a") return "none";
  if (s === "economy" || s.includes("plastic") || s.includes("aluminum") || s.includes("aluminium") || s.includes("steel"))
    return "economy";
  if (s === "bronze" || s.includes("nickel") || s.includes("brass")) return "bronze";
  if (s === "available" || s === "standard") return "bronze";
  return "none";
}

function normalizePortability(p: AnyProduct): "fixed" | "portable" | "portable_with_rolling_option" | "rolling_standard" {
  const s = String(p.portability ?? "").trim().toLowerCase();
  if (s === "rolling_standard") return "rolling_standard";
  if (s === "portable_with_rolling_option") return "portable_with_rolling_option";
  if (s === "portable") return "portable";
  return "fixed";
}

function formatMoney(n: number): string {
  return `$${Math.round(n)}`;
}

function formatIn(n: number): string {
  // Keep it simple: typical bender specs are in inches.
  return `${n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} in`;
}

function formatDeg(n: number): string {
  return `${Math.round(n)} deg`;
}

export function generateAutoProsCons(product: AnyProduct, allProducts: AnyProduct[]): AutoProCon[] {
  const p = product ?? {};
  const all = Array.isArray(allProducts) ? allProducts : [];

  const entryPrice = computeEntryPrice(p);
  const maxOd = computeMaxOdIn(p);
  const maxAngle = computeMaxBendAngleDeg(p);
  const wall175 = computeWallAt175In(p);
  const materialCount = computeMaterialCount(p);
  const materialTier = materialTierFromCount(materialCount);
  const mandrel = normalizeMandrelTier(p);
  const portability = normalizePortability(p);

  // Dataset stats (only compare among products that actually have a value).
  const entryPrices = all.map(computeEntryPrice).filter((n): n is number => n !== null && n > 0);
  const maxOds = all.map(computeMaxOdIn).filter((n): n is number => n !== null && n > 0);
  const angles = all.map(computeMaxBendAngleDeg).filter((n): n is number => n !== null && n > 0);
  const walls = all.map(computeWallAt175In).filter((n): n is number => n !== null && n > 0);

  const minEntry = entryPrices.length ? Math.min(...entryPrices) : null;
  const maxEntry = entryPrices.length ? Math.max(...entryPrices) : null;
  const maxOdMax = maxOds.length ? Math.max(...maxOds) : null;
  const angleMax = angles.length ? Math.max(...angles) : null;
  const wallMax = walls.length ? Math.max(...walls) : null;

  const pros: AutoItem[] = [];
  const cons: AutoItem[] = [];

  // Price position
  if (entryPrice === null) {
    cons.push({ id: "con:entry_price_missing", text: "Starter-system pricing not published (cannot compute an entry price)." });
  } else if (minEntry !== null && entryPrice === minEntry) {
    pros.push({ id: "pro:entry_price_lowest", text: `Lowest documented starter-system price in this comparison set (${formatMoney(entryPrice)}).` });
  } else if (maxEntry !== null && entryPrice === maxEntry && entryPrices.length >= 3) {
    // Only call out "highest" if there is a meaningful set size to avoid being silly in tiny sets.
    cons.push({ id: "con:entry_price_highest", text: `Highest documented starter-system price in this comparison set (${formatMoney(entryPrice)}).` });
  }

  // Max OD position
  if (maxOd === null) {
    cons.push({ id: "con:max_od_missing", text: "Max tube diameter (OD) not published (scores 0 by rule)." });
  } else if (maxOdMax !== null && maxOd === maxOdMax) {
    pros.push({ id: "pro:max_od_highest", text: `Largest published max tube OD in this comparison set (${formatIn(maxOd)}).` });
  }

  // Bend angle position
  if (maxAngle === null) {
    cons.push({ id: "con:bend_angle_missing", text: "Max bend angle not published (scores 0 by rule)." });
  } else if (angleMax !== null && maxAngle === angleMax) {
    pros.push({ id: "pro:bend_angle_highest", text: `Largest published max bend angle in this comparison set (${formatDeg(maxAngle)}).` });
  }

  // Wall thickness at 1.75
  if (wall175 === null) {
    cons.push({ id: "con:wall_175_missing", text: "Max wall thickness at 1.75 in OD not published (scores 0 by rule)." });
  } else if (wallMax !== null && wall175 === wallMax) {
    pros.push({ id: "pro:wall_175_highest", text: `Highest published max wall thickness at 1.75 in OD in this comparison set (${formatIn(wall175)}).` });
  }

  // Materials coverage (count-based, deterministic)
  // This is purely a documentation check: "how many of the canonical 7 materials are explicitly listed."
  if (materialTier === 0) {
    cons.push({
      id: "con:materials_missing",
      text: "No published materials compatibility list (materials coverage cannot be scored).",
    });
  } else if (materialTier === 4) {
    pros.push({
      id: "pro:materials_full_list",
      text: "Publishes a materials list covering all major material types commonly bent on this class of machine.",
    });
  } else {
    pros.push({
      id: "pro:materials_list_count",
      text: `Publishes a materials list covering ${materialCount} of 7 canonical material categories used on this site.`,
    });
  }

  // Mandrel tier
  if (mandrel === "bronze") {
    pros.push({ id: "pro:mandrel_bronze", text: "Manufacturer documents a bronze-class mandrel option for this frame." });
  } else if (mandrel === "economy") {
    pros.push({ id: "pro:mandrel_economy", text: "Manufacturer documents an economy mandrel option for this frame." });
  } else {
    cons.push({ id: "con:mandrel_none", text: "No documented mandrel capability for this frame (or not documented clearly enough to score)." });
  }

  // Portability tier (only call out the extremes to keep bullets sparse)
  if (portability === "rolling_standard") {
    pros.push({ id: "pro:portability_rolling_standard", text: "Rolling base is standard (no additional option required)." });
  } else if (portability === "fixed") {
    cons.push({ id: "con:portability_fixed", text: "Fixed-base configuration (no portability claim documented)." });
  }

  // Merge pros and cons into a flat array with enabled state
  // Check persisted enabled state from overlay, defaulting to true for new items
  const persistedAutoProsCons = Array.isArray(p.autoProsCons) ? p.autoProsCons : [];
  const enabledMap = new Map<string, boolean>();
  
  // Build map of persisted enabled states by matching text (stable identifier)
  for (const item of persistedAutoProsCons) {
    if (item && typeof item === "object" && "text" in item && "enabled" in item) {
      enabledMap.set(item.text as string, Boolean(item.enabled));
    }
  }

  // Apply per-item hide lists (legacy support - maps to enabled: false)
  const hiddenPros = parseHiddenList(p.hiddenAutoPros);
  const hiddenCons = parseHiddenList(p.hiddenAutoCons);

  const result: AutoProCon[] = [];

  // Add pros with enabled state
  for (const item of pros) {
    if (hiddenPros.has(item.id)) continue; // Legacy hide list still works
    const enabled = enabledMap.has(item.text) 
      ? enabledMap.get(item.text)! 
      : true; // Default to enabled for new items
    result.push({ type: "pro", text: item.text, enabled });
  }

  // Add cons with enabled state
  for (const item of cons) {
    if (hiddenCons.has(item.id)) continue; // Legacy hide list still works
    const enabled = enabledMap.has(item.text) 
      ? enabledMap.get(item.text)! 
      : true; // Default to enabled for new items
    result.push({ type: "con", text: item.text, enabled });
  }

  return result;
}

