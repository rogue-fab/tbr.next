"use client";

import { useEffect, useMemo, useState } from "react";
import { ACTIVE_THRESHOLD } from "../../../lib/completeness";
import { computeSystemPrice } from "../../../lib/systemPrice";

type Product = Record<string, any>;

function money(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "bad";
  hint?: string;
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "bad"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-gray-200 bg-gray-50 text-gray-800";
  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs font-medium">{label}</div>
      {hint ? <div className="mt-1 text-[0.7rem] opacity-80">{hint}</div> : null}
    </div>
  );
}

export function DiagnosticsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/products", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Failed to load products (${res.status}).`);
        }
        if (!cancelled) setProducts(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const diag = useMemo(() => {
    const rows = products.map((p) => {
      const name =
        [p.brand, p.model].filter(Boolean).join(" ").trim() || String(p.id ?? "—");
      const active = p.active === true;
      const filled = p?.completeness?.filled ?? 0;
      const totalFields = p?.completeness?.total ?? 0;
      const missing = (p?.completeness?.missing ?? []) as Array<{ label: string }>;
      const score = typeof p?.score?.total === "number" ? p.score.total : null;
      const entry = computeSystemPrice(p)?.entry ?? undefined;
      return { id: p.id, name, active, filled, totalFields, missing, score, entry };
    });

    const activeRows = rows.filter((r) => r.active).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const incompleteRows = rows
      .filter((r) => !r.active)
      .sort((a, b) => b.filled / (b.totalFields || 1) - a.filled / (a.totalFields || 1));

    // Price sanity: no computable price, or absurd (likely a parse/units bug).
    const noPrice = rows.filter((r) => !(typeof r.entry === "number" && r.entry > 0));
    const absurdPrice = rows.filter((r) => typeof r.entry === "number" && r.entry > 50000);

    return {
      rows,
      activeRows,
      incompleteRows,
      noPrice,
      absurdPrice,
      total: rows.length,
      activeCount: activeRows.length,
      thresholdMet: activeRows.length >= ACTIVE_THRESHOLD,
    };
  }, [products]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Diagnostics &amp; data health</h2>
        <p className="text-sm text-gray-500">
          Live status of the catalog: what&apos;s complete, what still needs data, and price sanity.
        </p>
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Total models" value={diag.total} />
              <Stat
                label="Active (live on site)"
                value={diag.activeCount}
                tone={diag.activeCount > 0 ? "good" : "neutral"}
              />
              <Stat
                label="Incomplete (hidden)"
                value={diag.total - diag.activeCount}
                tone={diag.total - diag.activeCount > 0 ? "warn" : "good"}
              />
              <Stat
                label={`Banner (needs ${ACTIVE_THRESHOLD} active)`}
                value={diag.thresholdMet ? "Can retire" : `${diag.activeCount}/${ACTIVE_THRESHOLD}`}
                tone={diag.thresholdMet ? "good" : "warn"}
                hint={diag.thresholdMet ? "Turn it off in the Banner tab" : "Fill models to reach the threshold"}
              />
            </div>

            {/* Data warnings */}
            {(diag.absurdPrice.length > 0 || diag.noPrice.length > 0) && (
              <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-900">Price checks</h3>
                {diag.absurdPrice.length > 0 && (
                  <p className="mt-1 text-xs text-amber-900">
                    <span className="font-semibold">{diag.absurdPrice.length}</span> model(s) with a system
                    price over $50,000 — almost always a parse/units bug:{" "}
                    {diag.absurdPrice.map((r) => `${r.name} (${money(r.entry)})`).join(", ")}.
                  </p>
                )}
                {diag.noPrice.length > 0 && (
                  <p className="mt-1 text-xs text-amber-900">
                    <span className="font-semibold">{diag.noPrice.length}</span> model(s) with no computable
                    system price (Value for Money will score 0):{" "}
                    {diag.noPrice.slice(0, 12).map((r) => r.name).join(", ")}
                    {diag.noPrice.length > 12 ? "…" : ""}.
                  </p>
                )}
              </div>
            )}

            {/* Needs work */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-gray-900">
                Models still needing data ({diag.incompleteRows.length})
              </h3>
              <p className="mt-1 text-xs text-gray-500">Closest to complete first. These stay hidden from the public site until 100% filled.</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-700">
                    <tr className="text-left">
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2 whitespace-nowrap">Complete</th>
                      <th className="px-3 py-2">Still missing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {diag.incompleteRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-sm text-emerald-700">
                          Every model is complete. 🎉
                        </td>
                      </tr>
                    ) : (
                      diag.incompleteRows.map((r) => (
                        <tr key={r.id} className="text-gray-800">
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {r.filled}/{r.totalFields}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {r.missing.slice(0, 5).map((m) => m.label).join(", ")}
                            {r.missing.length > 5 ? ` +${r.missing.length - 5} more` : ""}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live models */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-gray-900">Live models ({diag.activeRows.length})</h3>
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-700">
                    <tr className="text-left">
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2 whitespace-nowrap">Score</th>
                      <th className="px-3 py-2 whitespace-nowrap">System price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {diag.activeRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-sm text-gray-500">
                          No models are live yet — fill a model to 100% to activate it.
                        </td>
                      </tr>
                    ) : (
                      diag.activeRows.map((r) => (
                        <tr key={r.id} className="text-gray-800">
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold">
                            {r.score ?? "—"}/100
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{money(r.entry)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-6 text-[0.7rem] text-gray-400">
              Scoring config: 14 categories, 100 points total. Value for Money uses a fixed
              capability-per-$1,000 scale. Visitor analytics (traffic, geography, time on page) are a
              separate concern — see the Analytics tab.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
