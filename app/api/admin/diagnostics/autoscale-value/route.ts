import { NextResponse, type NextRequest } from "next/server";

import fs from "fs";
import path from "path";

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "lib",
  "autoscale",
  "value_snapshot.json"
);

const valueSnapshot = JSON.parse(
  fs.readFileSync(SNAPSHOT_PATH, "utf8")
);
import { getProductScore } from "../../../../../lib/scoring";
import * as catalog from "../../../../../lib/catalog";
import { isAuthorized, unauthorized } from "../../../../../lib/adminAuth";

const VALUE_INCLUDED_CRITERIA: string[] = [
  "Ease of Use & Setup",
  "Max Diameter & CLR Capability",
  "Bend Angle Capability",
  "Stress Capacity & Materials",
  "Die Selection & Shapes",
  "Upgrade Path & Modularity",
  "Mandrel Compatibility",
  "S-Bend Capability",
  "Single-Source System",
  "Warranty (Published Terms Only)",
];

type OffenderRow = {
  id: string;
  brand: string | null;
  model: string | null;
  entryPrice: number;
  capabilityPoints: number;
  rawValue: number;
  valueScore: number | null;
  totalScore: number | null;
};

type EligibleRow = {
  id: string;
  brand: string | null;
  model: string | null;
  entryPrice: number;
  capabilityPoints: number;
  rawValue: number;
};

type EntryPriceOutliers = {
  suspiciousThreshold: number;
  suspiciousCount: number;
  lowest: EligibleRow[];
  highest: EligibleRow[];
};

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function loadLocalCatalogProducts(): any[] {
  const mod: any = catalog as any;

  const candidates = [
    mod.PRODUCTS,
    mod.products,
    mod.CATALOG,
    mod.catalog,
    mod.TUBE_BENDERS,
    mod.tubeBenders,
    mod.default,
  ];

  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
  }

  for (const k of Object.keys(mod)) {
    const v = mod[k];
    if (Array.isArray(v) && v.length && typeof v[0] === "object" && v[0] && "id" in v[0]) return v;
  }

  throw new Error("[autoscale] Could not find a product array export in lib/catalog.ts");
}

function asId(v: unknown): string {
  return String(v ?? "").trim();
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const errors: string[] = [];

  const p10 = safeNumber((valueSnapshot as any)?.valueBand?.valueP10);
  const p90 = safeNumber((valueSnapshot as any)?.valueBand?.valueP90);

  if (!Number.isFinite(p10) || !Number.isFinite(p90) || p90 <= p10) {
    errors.push(
      `Value autoscale snapshot is missing or invalid. valueP10=${String(p10)} valueP90=${String(p90)}`,
    );
    return NextResponse.json({ status: "error", errors }, { status: 500 });
  }

  const all = loadLocalCatalogProducts() as any[];
  const belowP10: OffenderRow[] = [];
  const aboveP90: OffenderRow[] = [];
  const eligibleRows: EligibleRow[] = [];

  let eligibleProducts = 0;

  for (const p of all) {
    const id = asId((p as any)?.id);
    if (!id) continue;

    const score = getProductScore(p as any);
    const entryPrice = safeNumber((score as any)?.debugInput?.entryPrice);
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) continue;

    const breakdown = Array.isArray((score as any)?.breakdown) ? (score as any).breakdown : [];
    const capabilityPoints = breakdown
      .filter((b: any) => VALUE_INCLUDED_CRITERIA.includes(String(b?.criteria ?? "")))
      .reduce((sum: number, b: any) => sum + (safeNumber(b?.points) || 0), 0);

    if (!Number.isFinite(capabilityPoints) || capabilityPoints <= 0) continue;

    const rawValue = capabilityPoints / entryPrice;
    if (!Number.isFinite(rawValue) || rawValue <= 0) continue;

    eligibleProducts += 1;
    eligibleRows.push({
      id,
      brand: (p as any)?.brand ?? null,
      model: (p as any)?.model ?? null,
      entryPrice,
      capabilityPoints,
      rawValue,
    });

    if (rawValue < p10 || rawValue > p90) {
      const valueItem = breakdown.find((b: any) => String(b?.criteria ?? "") === "Value for Money");
      const valueScore = safeNumber(valueItem?.points);

      const row: OffenderRow = {
        id,
        brand: (p as any)?.brand ?? null,
        model: (p as any)?.model ?? null,
        entryPrice,
        capabilityPoints,
        rawValue,
        valueScore: Number.isFinite(valueScore) ? valueScore : null,
        totalScore: safeNumber((score as any)?.totalScore),
      };

      if (rawValue < p10) belowP10.push(row);
      if (rawValue > p90) aboveP90.push(row);
    }
  }

  belowP10.sort((a, b) => a.rawValue - b.rawValue);
  aboveP90.sort((a, b) => b.rawValue - a.rawValue);

  // Entry price sanity: if these look crazy, it's almost always a parse/units bug upstream
  // (e.g., cents vs dollars, comma/decimal parsing, unintended multipliers).
  const suspiciousThreshold = 100000; // USD
  const suspiciousCount = eligibleRows.filter((r) => r.entryPrice >= suspiciousThreshold).length;
  const byPriceAsc = [...eligibleRows].sort((a, b) => a.entryPrice - b.entryPrice);
  const byPriceDesc = [...eligibleRows].sort((a, b) => b.entryPrice - a.entryPrice);

  const entryPriceOutliers: EntryPriceOutliers = {
    suspiciousThreshold,
    suspiciousCount,
    lowest: byPriceAsc.slice(0, 5),
    highest: byPriceDesc.slice(0, 5),
  };

  const status = belowP10.length || aboveP90.length ? "warning" : "ok";

  return NextResponse.json({
    status,
    band: { valueP10: p10, valueP90: p90 },
    counts: {
      totalProductsSeen: all.length,
      eligibleProducts,
      offendersBelowP10: belowP10.length,
      offendersAboveP90: aboveP90.length,
    },
    entryPriceOutliers,
    offenders: {
      belowP10,
      aboveP90,
    },
  });
}
