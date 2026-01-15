"use client";

import type { ProductScore } from "../../lib/scoring";

type Props = {
  score: ProductScore | null | undefined;
};

/**
 * Renders the scoring breakdown for a single product.
 * Uses the canonical ProductScore shape (total + breakdown[]).
 */
export default function ScoreBreakdown({ score }: Props) {
  if (!score) {
    return (
      <div className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-600">
        No score data available.
      </div>
    );
  }

  const items = Array.isArray((score as any).breakdown) ? (score as any).breakdown : [];

  if (!items.length) {
    return (
      <div className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-600">
        No breakdown items available for this model.
      </div>
    );
  }

  const getLabel = (it: any): string => {
    // Canonical engine field
    if (it?.criteria != null && String(it.criteria).trim() !== "") return String(it.criteria);
    // Legacy fallbacks (older UI shapes)
    return String(it?.label ?? it?.category ?? it?.key ?? "—");
  };

  const getReason = (it: any): string => {
    // Canonical engine field
    if (it?.reasoning != null && String(it.reasoning).trim() !== "") return String(it.reasoning);
    // Legacy fallbacks
    return String(it?.reason ?? it?.notes ?? it?.explanation ?? "");
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Points</th>
            <th className="px-3 py-2">Why</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it: any, idx: number) => (
            <tr key={`${getLabel(it)}-${idx}`} className="align-top">
              <td className="px-3 py-2 font-medium text-gray-900">
                {getLabel(it)}
              </td>
              <td className="px-3 py-2 text-gray-800">
                {typeof it?.points === "number" ? it.points : "—"}
                {typeof it?.maxPoints === "number" ? ` / ${it.maxPoints}` : ""}
              </td>
              <td className="px-3 py-2 text-gray-700">
                {getReason(it) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
