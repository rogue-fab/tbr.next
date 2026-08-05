"use client";

import React from "react";
import { SCORING_CATEGORIES, TOTAL_POINTS, type ProductScore } from "../lib/scoring";

export default function ScoreBreakdownToggle({ score }: { score: ProductScore }) {
  const breakdown = Array.isArray(score?.breakdown) ? score.breakdown : [];

  // Map breakdown by stable key (injected by adapter layer). No display-name matching.
  const byKey = new Map<string, (typeof breakdown)[number]>();
  for (const item of breakdown) {
    const k = (item as any)?.key;
    if (typeof k === "string" && k.trim() !== "") byKey.set(k, item);
  }

  // Compute a safe total from breakdown (diagnostic only)
  const computedTotal = breakdown.reduce((sum, b) => sum + (Number(b.points) || 0), 0);

  return (
    <details className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <summary className="cursor-pointer select-none text-sm font-semibold text-gray-900 dark:text-gray-100">
        Scoring audit (inputs + math)
      </summary>

      <div className="mt-2 text-[0.7rem] text-gray-500 dark:text-gray-400">
        This section shows the exact inputs and calculations used to generate the score above.
      </div>

      {/* Inputs we actually used */}
      {(score as any)?.debugInput ? (
        <div className="mt-3">
          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">Scoring inputs (interpreted)</div>
          <pre className="mt-2 max-h-[240px] overflow-auto rounded bg-gray-50 dark:bg-gray-900 p-3 text-[12px] leading-snug text-gray-900 dark:text-gray-100">
{JSON.stringify((score as any).debugInput, null, 2)}
          </pre>
        </div>
      ) : null}

      {/* Category rows */}
      <div className="mt-3 space-y-2">
        <div className="flex items-baseline justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>
            Total (breakdown): <span className="font-semibold text-gray-900 dark:text-gray-100">{computedTotal}</span> / {TOTAL_POINTS}
          </span>
          <span>
            Total (badge): <span className="font-semibold text-gray-900 dark:text-gray-100">{score?.total ?? "—"}</span> / {TOTAL_POINTS}
          </span>
        </div>

        <div className="divide-y rounded border">
          {SCORING_CATEGORIES.map((cat) => {
            // Match by stable key only.
            const hit = byKey.get(cat.key);
            const pts = hit?.points ?? 0;
            const max = hit?.maxPoints ?? cat.maxPoints ?? 0;
            return (
              <div key={cat.key} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{cat.name}</div>
                    {hit?.reasoning ? (
                      <div className="mt-1 text-[0.7rem] text-gray-500 dark:text-gray-400">{hit.reasoning}</div>
                    ) : (
                      <div className="mt-1 text-[0.7rem] text-gray-400 dark:text-gray-500">
                        No breakdown entry matched this category key. (Adapter key-mapping issue)
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-[0.75rem] font-semibold text-gray-900 dark:text-gray-100">
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
