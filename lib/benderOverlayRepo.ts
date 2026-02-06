// lib/benderOverlayRepo.ts
import { sql } from "./db";

/**
 * Canonical shape the rest of the app uses (camelCase).
 * This mirrors the columns in the Neon table `bender_overlays`.
 */
export type BenderOverlayRecord = {
  productId: string;
  usaManufacturingTier: number | null;
  originTransparencyTier: number | null;
  singleSourceSystemTier: number | null;
  warrantyTier: number | null;
  portability: string | null;
  wallThicknessCapacity: string | null;
  materials: string | null;
  dieShapes: string | null;
  mandrel: string | null;
  hasPowerUpgradePath: boolean;
  lengthStop: boolean;
  rotationIndexing: boolean;
  angleMeasurement: boolean;
  autoStop: boolean;
  thickWallUpgrade: boolean;
  thinWallUpgrade: boolean;
  wiperDieSupport: boolean;
  sBendCapability: boolean | null;
};

export type BenderOverlayInput = Omit<BenderOverlayRecord, "productId">;

/**
 * Map a raw DB row (snake_case) into our camelCase record.
 */
function mapRow(row: any): BenderOverlayRecord {
  return {
    productId: row.product_id,
    usaManufacturingTier: row.usa_manufacturing_tier,
    originTransparencyTier: row.origin_transparency_tier,
    singleSourceSystemTier: row.single_source_system_tier,
    warrantyTier: row.warranty_tier,
    portability: row.portability,
    wallThicknessCapacity: row.wall_thickness_capacity,
    materials: row.materials,
    dieShapes: row.die_shapes,
    mandrel: row.mandrel,
    hasPowerUpgradePath: !!row.has_power_upgrade_path,
    lengthStop: !!row.length_stop,
    rotationIndexing: !!row.rotation_indexing,
    angleMeasurement: !!row.angle_measurement,
    autoStop: !!row.auto_stop,
    thickWallUpgrade: !!row.thick_wall_upgrade,
    thinWallUpgrade: !!row.thin_wall_upgrade,
    wiperDieSupport: !!row.wiper_die_support,
    sBendCapability: row.s_bend_capability ?? null,
  };
}

/**
 * Fetch a single overlay row by product id.
 * Returns null if no row exists yet.
 */
export async function getBenderOverlay(
  productId: string,
): Promise<BenderOverlayRecord | null> {
  const rows = await sql/* sql */`
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
    WHERE product_id = ${productId}
  `;

  if (!rows || rows.length === 0) return null;
  return mapRow(rows[0]);
}

/**
 * Upsert overlay row for a product.
 * - Inserts a new row if none exists.
 * - Updates all columns if it does.
 */
export async function upsertBenderOverlay(
  productId: string,
  input: BenderOverlayInput,
): Promise<BenderOverlayRecord> {
  const rows = await sql/* sql */`
    INSERT INTO bender_overlays (
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
    )
    VALUES (
      ${productId},
      ${input.usaManufacturingTier},
      ${input.originTransparencyTier},
      ${input.singleSourceSystemTier},
      ${input.warrantyTier},
      ${input.portability},
      ${input.wallThicknessCapacity},
      ${input.materials},
      ${input.dieShapes},
      ${input.mandrel},
      ${input.hasPowerUpgradePath},
      ${input.lengthStop},
      ${input.rotationIndexing},
      ${input.angleMeasurement},
      ${input.autoStop},
      ${input.thickWallUpgrade},
      ${input.thinWallUpgrade},
      ${input.wiperDieSupport},
      ${input.sBendCapability}
    )
    ON CONFLICT (product_id) DO UPDATE
    SET
      usa_manufacturing_tier      = EXCLUDED.usa_manufacturing_tier,
      origin_transparency_tier    = EXCLUDED.origin_transparency_tier,
      single_source_system_tier   = EXCLUDED.single_source_system_tier,
      warranty_tier               = EXCLUDED.warranty_tier,
      portability                 = EXCLUDED.portability,
      wall_thickness_capacity     = EXCLUDED.wall_thickness_capacity,
      materials                   = EXCLUDED.materials,
      die_shapes                  = EXCLUDED.die_shapes,
      mandrel                     = EXCLUDED.mandrel,
      has_power_upgrade_path      = EXCLUDED.has_power_upgrade_path,
      length_stop                 = EXCLUDED.length_stop,
      rotation_indexing           = EXCLUDED.rotation_indexing,
      angle_measurement           = EXCLUDED.angle_measurement,
      auto_stop                   = EXCLUDED.auto_stop,
      thick_wall_upgrade          = EXCLUDED.thick_wall_upgrade,
      thin_wall_upgrade           = EXCLUDED.thin_wall_upgrade,
      wiper_die_support           = EXCLUDED.wiper_die_support,
      s_bend_capability           = EXCLUDED.s_bend_capability
    RETURNING
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
  `;

  return mapRow(rows[0]);
}
// Add this type if it doesn't already exist
export type BenderOverlayRow = {
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

// This is the normalized shape we’ll merge into Product objects.
// (camelCase, matching your JSON overlay fields)
export type BenderOverlayPatch = {
  productId: string;
  usaManufacturingTier: number | null;
  originTransparencyTier: number | null;
  singleSourceSystemTier: number | null;
  warrantyTier: number | null;
  portability: string | null;
  wallThicknessCapacity: string | null;
  materials: string | null;
  dieShapes: string | null;
  mandrel: string | null;
  hasPowerUpgradePath: boolean;
  lengthStop: boolean;
  rotationIndexing: boolean;
  angleMeasurement: boolean;
  autoStop: boolean;
  thickWallUpgrade: boolean;
  thinWallUpgrade: boolean;
  wiperDieSupport: boolean;
  sBendCapability: boolean | null;
};

/**
 * Load all rows from bender_overlays and return a map keyed by product_id.
 * This is used on the read-side to overlay scoring-related fields on top
 * of the JSON admin overlay.
 */
export async function getAllBenderOverlaysMap(): Promise<
  Record<string, BenderOverlayPatch>
> {
  const rows = (await sql`
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

  const map: Record<string, BenderOverlayPatch> = {};

  for (const row of rows) {
    map[row.product_id] = {
      productId: row.product_id,
      usaManufacturingTier: row.usa_manufacturing_tier ?? null,
      originTransparencyTier: row.origin_transparency_tier ?? null,
      singleSourceSystemTier: row.single_source_system_tier ?? null,
      warrantyTier: row.warranty_tier ?? null,
      portability: row.portability ?? null,
      wallThicknessCapacity: row.wall_thickness_capacity ?? null,
      materials: row.materials ?? null,
      dieShapes: row.die_shapes ?? null,
      mandrel: row.mandrel ?? null,
      hasPowerUpgradePath: !!row.has_power_upgrade_path,
      lengthStop: !!row.length_stop,
      rotationIndexing: !!row.rotation_indexing,
      angleMeasurement: !!row.angle_measurement,
      autoStop: !!row.auto_stop,
      thickWallUpgrade: !!row.thick_wall_upgrade,
      thinWallUpgrade: !!row.thin_wall_upgrade,
      wiperDieSupport: !!row.wiper_die_support,
    sBendCapability: row.s_bend_capability ?? null,
    };
  }

  return map;
}

/**
 * Load overlay rows for a specific set of product IDs.
 * Returns a map keyed by product_id.
 */
export async function getAllBenderOverlaysById(
  ids: string[],
): Promise<Record<string, BenderOverlayPatch>> {
  const rows = (await sql`
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
    WHERE product_id = ANY(${ids})
  `) as unknown as BenderOverlayRow[];

  const out: Record<string, BenderOverlayPatch> = {};
  for (const r of rows) {
    if (!r.product_id) continue;
    out[r.product_id] = {
      productId: r.product_id,
      usaManufacturingTier: r.usa_manufacturing_tier ?? null,
      originTransparencyTier: r.origin_transparency_tier ?? null,
      singleSourceSystemTier: r.single_source_system_tier ?? null,
      warrantyTier: r.warranty_tier ?? null,
      portability: r.portability ?? null,
      wallThicknessCapacity: r.wall_thickness_capacity ?? null,
      materials: r.materials ?? null,
      dieShapes: r.die_shapes ?? null,
      mandrel: r.mandrel ?? null,
      hasPowerUpgradePath: !!r.has_power_upgrade_path,
      lengthStop: !!r.length_stop,
      rotationIndexing: !!r.rotation_indexing,
      angleMeasurement: !!r.angle_measurement,
      autoStop: !!r.auto_stop,
      thickWallUpgrade: !!r.thick_wall_upgrade,
      thinWallUpgrade: !!r.thin_wall_upgrade,
      wiperDieSupport: !!r.wiper_die_support,
    sBendCapability: r.s_bend_capability ?? null,
    };
  }
  return out;
}
