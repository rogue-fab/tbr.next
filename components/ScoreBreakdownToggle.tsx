"use client";

import React from "react";
import { SCORING_CATEGORIES, TOTAL_POINTS, type ProductScore } from "../lib/scoring";

function norm(s: unknown): string {
  // Normalize dash/hyphen variants (common copy/paste/typography issue).
  // Without this, strings like "S-Bend" (U+2011) and "S-Bend" (ASCII) won't match.
  const raw = String(s ?? "");
  const normalizedDashes = raw.replace(
    /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g,
    "-",
  );
  return normalizedDashes
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


export default function ScoreBreakdownToggle({ score }: { score: ProductScore }) {
  const breakdown = Array.isArray(score?.breakdown) ? score.breakdown : [];

  // UI name → engine criterion name aliases (only where they differ).
  // Keep this tiny and explicit to avoid "canonicalization" creep.
  const CRITERIA_ALIASES: Record<string, string> = {
    [norm("True S-Bend Capability")]: norm("S-Bend Capability"),
  };

  // Map breakdown by normalized criteria name (engine returns `criteria` strings)
  const byCriteria = new Map<string, (typeof breakdown)[number]>();
  for (const item of breakdown) {
    byCriteria.set(norm(item.criteria), item);
  }

  // Compute a safe total from breakdown (diagnostic only)
  const computedTotal = breakdown.reduce((sum, b) => sum + (Number(b.points) || 0), 0);

  return (
    <details className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer select-none text-sm font-semibold text-gray-900">
        Score math (diagnostic)
      </summary>

      {/* Inputs we actually used */}
      {(score as any)?.debugInput ? (
        <div className="mt-3">
          <div className="text-xs font-semibold text-gray-900">Scoring inputs (interpreted)</div>
          <pre className="mt-2 max-h-[240px] overflow-auto rounded bg-gray-50 p-3 text-[12px] leading-snug text-gray-900">
{JSON.stringify((score as any).debugInput, null, 2)}
          </pre>
        </div>
      ) : null}

      {/* Category rows */}
      <div className="mt-3 space-y-2">
        <div className="flex items-baseline justify-between text-xs text-gray-600">
          <span>
            Total (breakdown): <span className="font-semibold text-gray-900">{computedTotal}</span> / {TOTAL_POINTS}
          </span>
          <span>
            Total (badge): <span className="font-semibold text-gray-900">{score?.total ?? "—"}</span> / {TOTAL_POINTS}
          </span>
        </div>

        <div className="divide-y rounded border">
          {SCORING_CATEGORIES.map((cat) => {
            // Match by displayed name, with a small explicit alias map where needed.
            const want = norm(cat.name);
            const wantAliased = CRITERIA_ALIASES[want] ?? want;
            const hit = byCriteria.get(wantAliased);
            const pts = hit?.points ?? 0;
            const max = hit?.maxPoints ?? cat.maxPoints ?? 0;
            return (
              <div key={cat.key} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900">{cat.name}</div>
                    {hit?.reasoning ? (
                      <div className="mt-1 text-[0.7rem] text-gray-500">{hit.reasoning}</div>
                    ) : (
                      <div className="mt-1 text-[0.7rem] text-gray-400">
                        No breakdown entry matched this category name. (UI lookup issue)
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-[0.75rem] font-semibold text-gray-900">
                    {pts}/{max}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
