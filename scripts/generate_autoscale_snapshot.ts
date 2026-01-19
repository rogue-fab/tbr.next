/* eslint-disable no-console */
/**
 * Generate autoscale snapshots used by scoring.
 *
 * Outputs:
 * - lib/autoscale/value_snapshot.json: value autoscale band (P10/P90) + offenders
 * - lib/autoscale/snapshot.json: wrapper snapshot (currently just value; expandable later)
 *
 * Rules (FTC-safe, deterministic):
 * - Only include samples where entryPrice > 0
 * - Only include samples where capabilityPoints > 0 (per Joey preference)
 */

import fs from "node:fs";
import path from "node:path";

import { getAllTubeBendersWithOverlay } from "../lib/catalogOverlay";
import { getProductScore } from "../lib/scoring";

type ValueSample = {
  id: string;
  brand?: string | null;
  model?: string | null;
  entryPrice: number;
  capabilityPoints: number;
  rawValue: number; // capabilityPoints / entryPrice
};

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

function quantile(sortedAsc: number[], q: number): number {
  if (!sortedAsc.length) return NaN;
  if (q <= 0) return sortedAsc[0];
  if (q >= 1) return sortedAsc[sortedAsc.length - 1];

  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sortedAsc[base];
  const b = sortedAsc[Math.min(base + 1, sortedAsc.length - 1)];
  return a + rest * (b - a);
}

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(targetPath: string, obj: unknown): void {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function main(): Promise<void> {
  const root = process.cwd();
  const outDir = path.join(root, "lib", "autoscale");
  const outValue = path.join(outDir, "value_snapshot.json");
  const outSnapshot = path.join(outDir, "snapshot.json");

  // NOTE: This pulls the merged base catalog + overlay.
  // If Neon overlays are enabled in your environment, it will include them.
  const all = await getAllTubeBendersWithOverlay();

  const samples: ValueSample[] = [];

  for (const p of all as any[]) {
    const id = String((p as any)?.id ?? "").trim();
    if (!id) continue;

    // Get computed score + breakdown WITHOUT providing ctx,
    // so Value will use fallback tiering. That's OK because we only need
    // capabilityPoints (which excludes Value itself).
    const score = getProductScore(p as any);

    const entryPrice = safeNumber((score as any)?.debugInput?.entryPrice);
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) continue;

    const breakdown = Array.isArray(score.breakdown) ? score.breakdown : [];
    const capabilityPoints = breakdown
      .filter((b: any) => VALUE_INCLUDED_CRITERIA.includes(String(b.criteria)))
      .reduce((sum: number, b: any) => sum + (safeNumber(b.points) || 0), 0);

    if (!Number.isFinite(capabilityPoints) || capabilityPoints <= 0) continue;

    const rawValue = capabilityPoints / entryPrice;
    if (!Number.isFinite(rawValue) || rawValue <= 0) continue;

    samples.push({
      id,
      brand: (p as any)?.brand ?? null,
      model: (p as any)?.model ?? null,
      entryPrice,
      capabilityPoints,
      rawValue,
    });
  }

  if (samples.length < 3) {
    console.error(
      `[autoscale] Not enough samples to compute quantiles. samples=${samples.length}. Aborting.`,
    );
    process.exitCode = 1;
    return;
  }

  const rawValues = samples.map((s) => s.rawValue).sort((a, b) => a - b);
  const p10 = quantile(rawValues, 0.1);
  const p90 = quantile(rawValues, 0.9);

  if (!Number.isFinite(p10) || !Number.isFinite(p90) || p90 <= p10) {
    console.error(
      `[autoscale] Invalid quantiles computed. p10=${String(p10)} p90=${String(p90)}. Aborting.`,
    );
    process.exitCode = 1;
    return;
  }

  const offendersBelow = samples
    .filter((s) => s.rawValue < p10)
    .sort((a, b) => a.rawValue - b.rawValue);

  const offendersAbove = samples
    .filter((s) => s.rawValue > p90)
    .sort((a, b) => b.rawValue - a.rawValue);

  const valueSnapshot = {
    generatedAtUtc: new Date().toISOString(),
    rules: {
      includeOnlyIfEntryPriceGt0: true,
      includeOnlyIfCapabilityPointsGt0: true,
      capabilityCriteriaIncluded: VALUE_INCLUDED_CRITERIA,
    },
    counts: {
      totalProductsSeen: (all as any[]).length,
      samplesUsed: samples.length,
      offendersBelowP10: offendersBelow.length,
      offendersAboveP90: offendersAbove.length,
    },
    valueBand: {
      valueP10: p10,
      valueP90: p90,
    },
    offenders: {
      belowP10: offendersBelow.map((s) => ({
        id: s.id,
        brand: s.brand,
        model: s.model,
        entryPrice: s.entryPrice,
        capabilityPoints: s.capabilityPoints,
        rawValue: s.rawValue,
      })),
      aboveP90: offendersAbove.map((s) => ({
        id: s.id,
        brand: s.brand,
        model: s.model,
        entryPrice: s.entryPrice,
        capabilityPoints: s.capabilityPoints,
        rawValue: s.rawValue,
      })),
    },
  };

  const snapshot = {
    generatedAtUtc: valueSnapshot.generatedAtUtc,
    value: valueSnapshot,
  };

  writeJson(outValue, valueSnapshot);
  writeJson(outSnapshot, snapshot);

  console.log(`[autoscale] Wrote ${path.relative(root, outValue)}`);
  console.log(`[autoscale] Wrote ${path.relative(root, outSnapshot)}`);
  console.log(
    `[autoscale] valueP10=${p10.toExponential(6)} valueP90=${p90.toExponential(6)} samples=${samples.length}`,
  );
}

main().catch((err) => {
  console.error("[autoscale] fatal error:", err);
  process.exitCode = 1;
});
