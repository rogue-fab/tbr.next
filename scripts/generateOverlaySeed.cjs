// scripts/generateOverlaySeed.cjs
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "data", "admin", "products.overlay.json");
const raw = fs.readFileSync(filePath, "utf8");
const data = JSON.parse(raw);


/** Extract leading int from strings like "4 – Frame + dies USA..." */
function parseTier(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const m = String(value).match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Yes/No/"true"/"false" → boolean or null */
function parseBool(value) {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  const v = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  return null;
}

/** Safely quote for SQL */
function sqlStr(value) {
  if (value == null) return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function sqlBool(value) {
  if (value === true) return "TRUE";
  if (value === false) return "FALSE";
  return "NULL";
}

const rows = [];

for (const [productId, p] of Object.entries(data)) {
  const row = {
    product_id: productId,
    usa_manufacturing_tier: parseTier(p.usaManufacturingTier),
    origin_transparency_tier: parseTier(p.originTransparencyTier),
    single_source_system_tier: parseTier(p.singleSourceSystemTier),
    warranty_tier: parseTier(p.warrantyTier),
    portability: p.portability ?? null,
    wall_thickness_capacity: p.wallThicknessCapacity ?? null,
    materials: p.materials ?? null,
    die_shapes: p.dieShapes ?? null,
    mandrel: p.mandrel ?? null,
    has_power_upgrade_path: parseBool(p.hasPowerUpgradePath),
    length_stop: parseBool(p.lengthStop),
    rotation_indexing: parseBool(p.rotationIndexing),
    angle_measurement: parseBool(p.angleMeasurement),
    auto_stop: parseBool(p.autoStop),
    thick_wall_upgrade: parseBool(p.thickWallUpgrade),
    thin_wall_upgrade: parseBool(p.thinWallUpgrade),
    wiper_die_support: parseBool(p.wiperDieSupport),
    s_bend_capability: parseBool(p.sBendCapability),
  };

  const cols = Object.keys(row);
  const vals = cols.map((k) => {
    const v = row[k];
    if (typeof v === "boolean" || v === null) return sqlBool(v);
    if (typeof v === "number") return String(v);
    return sqlStr(v);
  });

  rows.push(
    `(${cols
      .map((c) => `"${c}"`)
      .join(", ")}) VALUES (${vals.join(", ")})`
  );
}

const inserts = rows
  .map(
    (rv) =>
      `INSERT INTO bender_overlays ${rv}\nON CONFLICT (product_id) DO UPDATE SET\n  usa_manufacturing_tier = EXCLUDED.usa_manufacturing_tier,\n  origin_transparency_tier = EXCLUDED.origin_transparency_tier,\n  single_source_system_tier = EXCLUDED.single_source_system_tier,\n  warranty_tier = EXCLUDED.warranty_tier,\n  portability = EXCLUDED.portability,\n  wall_thickness_capacity = EXCLUDED.wall_thickness_capacity,\n  materials = EXCLUDED.materials,\n  die_shapes = EXCLUDED.die_shapes,\n  mandrel = EXCLUDED.mandrel,\n  has_power_upgrade_path = EXCLUDED.has_power_upgrade_path,\n  length_stop = EXCLUDED.length_stop,\n  rotation_indexing = EXCLUDED.rotation_indexing,\n  angle_measurement = EXCLUDED.angle_measurement,\n  auto_stop = EXCLUDED.auto_stop,\n  thick_wall_upgrade = EXCLUDED.thick_wall_upgrade,\n  thin_wall_upgrade = EXCLUDED.thin_wall_upgrade,\n  wiper_die_support = EXCLUDED.wiper_die_support,\n  s_bend_capability = EXCLUDED.s_bend_capability;\n`
  )
  .join("\n");

fs.writeFileSync(
  path.join(__dirname, "seed_bender_overlays.sql"),
  inserts,
  "utf8"
);

console.log("Wrote scripts/seed_bender_overlays.sql");
