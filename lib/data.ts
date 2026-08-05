/**
 * Centralized, ESM-only data reader.
 * Dynamically imports likely modules and extracts product IDs from many shapes.
 * No `require()`; safe for Next.js dev and Vercel.
 */
export type ProductId = { id: string };

type AnyMod = Record<string, unknown> & { default?: unknown };

function asIdsFromArray(v: unknown): ProductId[] {
  if (!Array.isArray(v) || v.length === 0) return [];
  const first = v[0] as any;
  // ["id","id2",...]
  if (typeof first === "string") return (v as string[]).map((id) => ({ id }));
  // [{id: "x"}, ...] or [{slug:"x"}, ...]
  if (typeof first === "object" && first) {
    const key = "id" in first ? "id" : ("slug" in first ? "slug" : undefined);
    if (key) return (v as any[]).map((x) => ({ id: String((x as any)[key]) }));
  }
  return [];
}

function asIdsFromObjectKeys(v: unknown): ProductId[] {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return Object.keys(v as Record<string, unknown>).map((id) => ({ id }));
  }
  return [];
}

function scanModule(mod: AnyMod): ProductId[] {
  // Try the most probable values first
  const candidates: unknown[] = [];
  if (mod?.default !== undefined) candidates.push(mod.default);
  for (const k of Object.keys(mod)) candidates.push((mod as AnyMod)[k]);

  for (const val of candidates) {
    // Arrays
    const arrIds = asIdsFromArray(val);
    if (arrIds.length) return arrIds;
    // Objects as maps
    const mapIds = asIdsFromObjectKeys(val);
    if (mapIds.length) return mapIds;
  }
  return [];
}

/**
 * Attempts dynamic imports in order; returns on first non-empty hit.
 * Add/remove candidates as your repo evolves.
 */
export async function listProductIds(): Promise<ProductId[]> {
  const loaders: Array<() => Promise<AnyMod>> = [
    () => import("./catalog"),
    () => import("./compare"),
    () => import("./reviews"),
  ];
  for (const load of loaders) {
    try {
      // Note: only include modules that actually exist; Next/Webpack resolves these at build time.
      // If a path does not exist, it will fail compilation even if wrapped in try/catch.
      const mod = await load();
      const ids = scanModule(mod);
      if (ids.length) return ids;
    } catch {
      // ignore and continue
    }
  }
  return [];
}
