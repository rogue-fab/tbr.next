import { sql } from "./db";

/**
 * Shape of a row in the `bender_overlays` table as created by:
 *
 *   CREATE TABLE IF NOT EXISTS bender_overlays (
 *     product_id text PRIMARY KEY,
 *     usa_manufacturing_tier int,
 *     origin_transparency_tier int,
 *     single_source_system_tier int,
 *     warranty_tier int,
 *     portability text,
 *     wall_thickness_capacity text,
 *     materials text,
 *     die_shapes text,
 *     mandrel text,
 *     has_power_upgrade_path boolean,
 *     length_stop boolean,
 *     rotation_indexing boolean,
 *     angle_measurement boolean,
 *     auto_stop boolean,
 *     thick_wall_upgrade boolean,
 *     thin_wall_upgrade boolean,
 *     wiper_die_support boolean,
 *     s_bend_capability boolean
 *   );
 */
export interface BenderOverlayRow {
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
}

/**
 * Normalised overlay shape we expose to the rest of the app.
 *
 * Keys are camelCased to line up with existing overlay / product fields:
 *   usaManufacturingTier, originTransparencyTier, singleSourceSystemTier, etc.
 *
 * NOTE: We only include fields that are actually non-null in the DB row so we
 * don't accidentally overwrite JSON overlay values with `null`.
 */
export interface BenderOverlay {
  productId: string;
  usaManufacturingTier?: number;
  originTransparencyTier?: number;
  singleSourceSystemTier?: number;
  warrantyTier?: number;
  portability?: string;
  wallThicknessCapacity?: string;
  materials?: string;
  dieShapes?: string;
  mandrel?: string;
  hasPowerUpgradePath?: boolean;
  lengthStop?: boolean;
  rotationIndexing?: boolean;
  angleMeasurement?: boolean;
  autoStop?: boolean;
  thickWallUpgrade?: boolean;
  thinWallUpgrade?: boolean;
  wiperDieSupport?: boolean;
  sBendCapability?: boolean | null;
}

/**
 * Load all overlays from Neon and return a map keyed by `product_id`.
 *
 * This is intentionally low-level; higher-level code (e.g. catalogOverlay)
 * can use it to layer DB-backed scoring fields on top of:
 * - base catalog products, and
 * - the existing JSON-backed overlay (pros/cons, marketing copy, etc.).
 */
export async function getBenderOverlayMap(): Promise<
  Record<string, BenderOverlay>
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
      console.warn(
        "[overlayRepo] Failed to load bender_overlays from Neon; falling back to no DB overlay:",
        (err as Error).message,
      );
    }
    return {};
  }

  const map: Record<string, BenderOverlay> = {};

  for (const row of rows) {
    if (!row.product_id) continue;

    const o: BenderOverlay = {
      productId: row.product_id,
    };

    // Only copy non-null values so we never overwrite JSON overlay values with nulls.
    if (row.usa_manufacturing_tier != null) {
      o.usaManufacturingTier = row.usa_manufacturing_tier;
    }
    if (row.origin_transparency_tier != null) {
      o.originTransparencyTier = row.origin_transparency_tier;
    }
    if (row.single_source_system_tier != null) {
      o.singleSourceSystemTier = row.single_source_system_tier;
    }
    if (row.warranty_tier != null) {
      o.warrantyTier = row.warranty_tier;
    }
    if (row.portability != null) {
      o.portability = row.portability;
    }
    if (row.wall_thickness_capacity != null) {
      o.wallThicknessCapacity = row.wall_thickness_capacity;
    }
    if (row.materials != null) {
      o.materials = row.materials;
    }
    if (row.die_shapes != null) {
      o.dieShapes = row.die_shapes;
    }
    if (row.mandrel != null) {
      o.mandrel = row.mandrel;
    }
    if (row.has_power_upgrade_path != null) {
      o.hasPowerUpgradePath = row.has_power_upgrade_path;
    }
    if (row.length_stop != null) {
      o.lengthStop = row.length_stop;
    }
    if (row.rotation_indexing != null) {
      o.rotationIndexing = row.rotation_indexing;
    }
    if (row.angle_measurement != null) {
      o.angleMeasurement = row.angle_measurement;
    }
    if (row.auto_stop != null) {
      o.autoStop = row.auto_stop;
    }
    if (row.thick_wall_upgrade != null) {
      o.thickWallUpgrade = row.thick_wall_upgrade;
    }
    if (row.thin_wall_upgrade != null) {
      o.thinWallUpgrade = row.thin_wall_upgrade;
    }
    if (row.wiper_die_support != null) {
      o.wiperDieSupport = row.wiper_die_support;
    }
    if (row.s_bend_capability != null) {
  o.sBendCapability = row.s_bend_capability ?? null;
    }

    map[row.product_id] = o;
  }

  return map;
}



