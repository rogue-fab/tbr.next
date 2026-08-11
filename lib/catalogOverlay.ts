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

import {
  allTubeBenders,
  type Product,
  type ProductCitation,
  type ProductCitationSourceType,
} from "./catalog";
import { getLatestPublishedVersionsForProducts } from "./productVersionsRepo";
import { getProductScore } from "./scoring";
import { computeCompleteness, isModelActive } from "./completeness";

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a line-based citations field (as entered in admin) into structured
 * ProductCitation objects.
 *
 * Expected format per line:
 *   category | sourceType | urlOrRef | title | accessed (YYYY-MM-DD) | note
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
 * Returns all tube benders as the SINGLE SOURCE OF TRUTH:
 *
 *   base catalog (identity/display)  →  published DB version (all spec data; wins)
 *
 * Identity keys (id/slug/name/brand/model/image) are stripped from the overlay so
 * spec data can never rename a product. The legacy JSON overlay and bender_overlays
 * table have been retired — product_versions (published) is the only spec source.
 *
 * Server-side reads only (pages, layouts, API routes).
 */
export async function getAllTubeBendersWithOverlay(): Promise<Product[]> {
  const base = allTubeBenders as any[];
  const ids = base
    .map((p: any) => (p as any).id as string | undefined)
    .filter(Boolean) as string[];

  const publishedRows = await getLatestPublishedVersionsForProducts(ids);
  const publishedMap: Record<string, any> = {};
  for (const row of publishedRows as any[]) {
    const pid = String((row as any).product_id ?? "");
    if (!pid) continue;
    publishedMap[pid] = (row as any).fields_json ?? {};
  }

  const mergedProducts = base.map((raw) => {
    const id = (raw as any).id as string | undefined;
    const publishedOverlay = id ? (publishedMap[id] ?? null) : null;

    // base product (identity/display) → published version (all spec data; wins).
    const merged = {
      ...(raw as any),
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
  // Also attach completeness/active status (single source of truth for the public
  // "only show finished models" gate and the admin completeness meter).
  const withScores = mergedProducts.map((p) => {
    const score = getProductScore(p, ctx);
    const completeness = computeCompleteness(p);
    return { ...p, score, completeness, active: isModelActive(p) };
  });

  return withScores;
}

/**
 * Convenience helper to retrieve a single tube bender by id/slug with the
 * published DB overlay applied.
 */
export async function findTubeBenderWithOverlay(
  predicate: (bender: Product) => boolean,
): Promise<Product | undefined> {
  const all = await getAllTubeBendersWithOverlay();
  return all.find(predicate);
}
