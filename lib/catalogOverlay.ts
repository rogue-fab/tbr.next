// Identity/display fields MUST come from the canonical base catalog.
// We intentionally ignore any overlay values for these keys because legacy overlay
// data can contain old rename experiments (ex: "A.ADMIN") and we never want overlays
// overriding product identity anywhere (admin dropdown, review headers, routes, etc).
const OVERLAY_BLOCKED_KEYS = new Set<string>([
  "id",
  "slug",
  "name",
  "brand",
  "model",
  "image",
]);

function stripBlockedOverlayKeys(fields: any): any {
  if (!fields || typeof fields !== "object") return fields;
  const out: any = { ...fields };
  for (const k of Object.keys(out)) {
    if (OVERLAY_BLOCKED_KEYS.has(k)) delete out[k];
  }
  return out;
}

// IMPORTANT:
// Apply stripBlockedOverlayKeys(...) at every place overlay fields merge into base products.

import {
  allTubeBenders,
  type Product,
  type ProductCitation,
  type ProductCitationSourceType,
} from "./catalog";
import { mergeWithOverlay } from "./adminStore";
import { sql } from "./db";
import { getLatestPublishedVersionsForProducts } from "./productVersionsRepo";
import { getProductScore } from "./scoring";

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Neon row shape for bender_overlays.
 * Keep in sync with the CREATE TABLE definition.
 */
type BenderOverlayRow = {
  product_id: string;
  usa_manufacturing_tier: number | null;
  origin_transparency_tier: number | null;
  single_source_system_tier: number | null;
  warranty_tier: number | null;
  portability: string | null;
  wall_thickness_capacity: string | null;
  materials: string | null;
  die_shapes: string | null;
  mandrel: string | null;
  has_power_upgrade_path: boolean | null;
  length_stop: boolean | null;
  rotation_indexing: boolean | null;
  angle_measurement: boolean | null;
  auto_stop: boolean | null;
  thick_wall_upgrade: boolean | null;
  thin_wall_upgrade: boolean | null;
  wiper_die_support: boolean | null;
  s_bend_capability: boolean | null;
};

/**
 * Fetch all Neon-backed overlays and map them to the camelCase properties
 * the rest of the app / scoring engine expects to see on Product objects.
 *
 * Result is keyed by product_id (slug).
 */
async function fetchNeonOverlays(): Promise<
  Record<string, Partial<Product>>
> {
  let rows: BenderOverlayRow[] = [];
  try {
    rows = (await sql`
      SELECT
        product_id,
        usa_manufacturing_tier,
        origin_transparency_tier,
        single_source_system_tier,
        warranty_tier,
        portability,
        wall_thickness_capacity,
        materials,
        die_shapes,
        mandrel,
        has_power_upgrade_path,
        length_stop,
        rotation_indexing,
        angle_measurement,
        auto_stop,
        thick_wall_upgrade,
        thin_wall_upgrade,
        wiper_die_support,
        s_bend_capability
      FROM bender_overlays
    `) as unknown as BenderOverlayRow[];
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // In local dev, make it obvious if the Neon query is failing.
      // In production we fail closed and just fall back to JSON overlay.
      console.warn(
        "[catalogOverlay] Failed to load Neon overlays:",
        (err as Error).message,
      );
    }
    return {};
  }

  const map: Record<string, Partial<Product>> = {};

  for (const row of rows) {
    const id = row.product_id;
    if (!id) continue;

    // materials/die_shapes are stored as text; we keep them as strings here.
    // getProductScore() already knows how to normalise them (it splits strings
    // into arrays).
    map[id] = {
      // Disclosure-based tiers
      usaManufacturingTier: row.usa_manufacturing_tier ?? null,
      originTransparencyTier: row.origin_transparency_tier ?? null,
      singleSourceSystemTier: row.single_source_system_tier ?? null,
      warrantyTier: row.warranty_tier ?? null,

      // Portability and capacity/text fields
      portability: row.portability ?? null,
      wallThicknessCapacity: row.wall_thickness_capacity ?? null,
      materials: row.materials ?? null,
      dieShapes: row.die_shapes ?? null,
      mandrel: row.mandrel ?? null,

      // Upgrade path & capability flags
      hasPowerUpgradePath: row.has_power_upgrade_path ?? false,
      lengthStop: row.length_stop ?? false,
      rotationIndexing: row.rotation_indexing ?? false,
      angleMeasurement: row.angle_measurement ?? false,
      autoStop: row.auto_stop ?? false,
      thickWallUpgrade: row.thick_wall_upgrade ?? false,
      thinWallUpgrade: row.thin_wall_upgrade ?? false,
      wiperDieSupport: row.wiper_die_support ?? false,
      sBendCapability: row.s_bend_capability ?? null,
    } as Partial<Product>;
  }

  return map;
}

/**
 * Parse a line-based citations field (as entered in admin) into structured
 * ProductCitation objects.
 *
 * Expected format per line:
 *   category | sourceType | urlOrRef | title | accessed (YYYY-MM-DD) | note
 *
 * - category: scoring category key (e.g. "valueForMoney", "bendAngleCapability").
 * - sourceType: "web-page" | "pdf" | "manual" | "email" | "other" (case-insensitive).
 * - urlOrRef: URL or internal reference.
 * - title: short human label.
 * - accessed: optional date string (YYYY-MM-DD preferred).
 * - note: freeform explanation (page/section / what was used).
 */
function parseCitationLines(raw: unknown): ProductCitation[] {
  if (typeof raw !== "string") return [];

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const allowedTypes: ProductCitationSourceType[] = [
    "web-page",
    "pdf",
    "manual",
    "email",
    "other",
  ];

  const citations: ProductCitation[] = [];

  lines.forEach((line, index) => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 3) {
      // Require at least category, sourceType, urlOrRef.
      return;
    }

    const [
      categoryRaw,
      sourceTypeRaw,
      urlOrRefRaw,
      titleRaw,
      accessedRaw,
      ...noteParts
    ] = parts;

    const category = categoryRaw || "unspecified";
    const urlOrRef = urlOrRefRaw || "";
    if (!urlOrRef) return;

    const normalizedType = (sourceTypeRaw || "other").toLowerCase();
    const sourceType = (allowedTypes.includes(
      normalizedType as ProductCitationSourceType,
    )
      ? normalizedType
      : "other") as ProductCitationSourceType;

    const title = titleRaw || null;
    const accessed = accessedRaw || null;
    const note =
      noteParts.length > 0 ? noteParts.join(" | ").trim() || null : null;

    citations.push({
      id: `${category}-${index + 1}`,
      category,
      field: null,
      sourceType,
      urlOrRef,
      title,
      accessed,
      note,
    });
  });

  return citations;
}

/**
 * Returns all tube benders with:
 *
 *   base catalog
 *   → JSON overlay (data/admin/products.overlay.json)
 *   → Neon overlay (bender_overlays table)
 *
 * Neon values win over JSON when both define the same field.
 *
 * This is intended for server-side reads only (pages, layouts, API routes).
 */
export async function getAllTubeBendersWithOverlay(): Promise<Product[]> {
  // 1) Base catalog + JSON overlay (legacy) – synchronous.
  const baseWithJsonOverlay = mergeWithOverlay(allTubeBenders);

  // 2) Neon overlays (async).
  const neonMap = await fetchNeonOverlays();

  // 3) Published version overlays (async).
  // These must be the final authority for public reads.
  const ids = baseWithJsonOverlay
    .map((p: any) => (p as any).id as string | undefined)
    .filter(Boolean) as string[];

  const publishedRows = await getLatestPublishedVersionsForProducts(ids);
  const publishedMap: Record<string, any> = {};
  for (const row of publishedRows as any[]) {
    const pid = String((row as any).product_id ?? "");
    if (!pid) continue;
    publishedMap[pid] = (row as any).fields_json ?? {};
  }

  const mergedProducts = baseWithJsonOverlay.map((raw) => {
    const id = (raw as any).id as string | undefined;
    const neonOverlay = id ? neonMap[id] ?? null : null;

    const publishedOverlay = id ? (publishedMap[id] ?? null) : null;

    // Order matters:
    //   base product → JSON overlay → legacy Neon overlay → published version overlay
    // Published version must win so admin Publish actually affects public pages + scoring.
    // Ensure overlays cannot override canonical identity keys.
    // (Fixes legacy "double name" artifacts like "A ADMIN".)
    const merged = {
      ...(raw as any),
      ...(neonOverlay ? stripBlockedOverlayKeys(neonOverlay) : {}),
      ...(publishedOverlay ? stripBlockedOverlayKeys(publishedOverlay) : {}),
    };

    const b = { ...merged } as Product & { highlights?: unknown };

    // Normalize highlights:
    // - base catalog uses string[]
    // - admin overlay may write a single comma-separated string
    if (typeof b.highlights === "string") {
      const parts = (b.highlights as string)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      b.highlights = parts as unknown as Product["highlights"];
    }

    const overlayFields = merged as any;

    let parsedCitations: ProductCitation[] | null = null;
    if (Array.isArray(overlayFields.citations)) {
      parsedCitations = overlayFields.citations
        .map((c: any, index: number) => {
          if (!c || typeof c !== "object") return null;
          const id =
            typeof c.id === "string" && c.id.length > 0
              ? c.id
              : `citation-${index + 1}`;
          return {
            id,
            category: String(c.category ?? "unspecified"),
            field: c.field ?? null,
            sourceType: (c.sourceType ??
              "other") as ProductCitationSourceType,
            urlOrRef: String(c.urlOrRef ?? ""),
            title: c.title ?? null,
            accessed: c.accessed ?? null,
            note: c.note ?? null,
          } satisfies ProductCitation;
        })
        .filter(Boolean) as ProductCitation[];
    } else if (typeof overlayFields.citationsRaw === "string") {
      const parsed = parseCitationLines(overlayFields.citationsRaw);
      if (parsed.length > 0) {
        parsedCitations = parsed;
      }
    }

    return {
      ...b,
      pros: overlayFields.pros ?? b.pros ?? null,
      cons: overlayFields.cons ?? b.cons ?? null,
      consSources: overlayFields.consSources ?? b.consSources ?? null,
      keyFeatures: overlayFields.keyFeatures ?? b.keyFeatures ?? null,
      materials: overlayFields.materials ?? b.materials ?? null,
      citationsRaw: overlayFields.citationsRaw ?? b.citationsRaw ?? null,
      citations: parsedCitations ?? b.citations ?? null,
      // Persist auto pros/cons enabled state from overlay
      autoProsCons: Array.isArray(overlayFields.autoProsCons) 
        ? overlayFields.autoProsCons 
        : undefined,
    } as Product;
  });

  // Compute dataset min/max for autoscaled categories (OD + Bend Angle).
  // CLR intentionally excluded for now.
  let minOd: number | null = null;
  let maxOd: number | null = null;
  let minAngle: number | null = null;
  let maxAngle: number | null = null;

  for (const p of mergedProducts as any[]) {
    const od = toNum((p as any)?.maxCapacity ?? (p as any)?.capacity);
    if (od != null && od > 0) {
      minOd = minOd == null ? od : Math.min(minOd, od);
      maxOd = maxOd == null ? od : Math.max(maxOd, od);
    }
    const ang = toNum((p as any)?.bendAngle ?? (p as any)?.maxBendAngle);
    if (ang != null && ang > 0) {
      minAngle = minAngle == null ? ang : Math.min(minAngle, ang);
      maxAngle = maxAngle == null ? ang : Math.max(maxAngle, ang);
    }
  }

  const ctx = {
    minOdIn: minOd,
    maxOdIn: maxOd,
    minBendAngleDeg: minAngle,
    maxBendAngleDeg: maxAngle,
  };

  // Attach computed score using dataset context so review totals actually autoscale.
  const withScores = mergedProducts.map((p) => {
    const score = getProductScore(p, ctx);
    return { ...p, score };
  });

  return withScores;
}

/**
 * Convenience helper to retrieve a single tube bender by id/slug with the
 * JSON + Neon overlay applied.
 *
 * NOTE: now async because it depends on Neon.
 */
export async function findTubeBenderWithOverlay(
  predicate: (bender: Product) => boolean,
): Promise<Product | undefined> {
  const all = await getAllTubeBendersWithOverlay();
  return all.find(predicate);
}
