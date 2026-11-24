"use client";

import { useEffect, useMemo, useState } from "react";
import { ACTIVE_THRESHOLD } from "../../../lib/completeness";
import { computeSystemPrice } from "../../../lib/systemPrice";

type Product = Record<string, any>;

type PriceCheck = { checkedAt: string; result: "unchanged" | "changed" | "unreachable"; notes?: string; by?: string };

const PRICE_FIELDS = [
  ["framePriceMin", "Frame"],
  ["framePriceMax", "Frame (max)"],
  ["diePriceMin", "Die"],
  ["diePriceMax", "Die (max)"],
  ["hydraulicPriceMin", "Power"],
  ["hydraulicPriceMax", "Power (max)"],
  ["standPriceMin", "Stand"],
  ["standPriceMax", "Stand (max)"],
] as const;

/** Parse the loose date strings stored in <field>Source2 ("2026-02-10", "2026 02-10", ...). */
function parseLooseDate(raw: unknown): Date | null {
  const m = String(raw ?? "").match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(d: Date | null): number | null {
  return d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null;
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

/** Per model: oldest/newest price citation date, last scrub check, and a freshness status. */
function priceFreshness(p: Product, check: PriceCheck | undefined) {
  const dated: { label: string; date: Date | null; url: string }[] = [];
  for (const [key, label] of PRICE_FIELDS) {
    const v = p[key];
    if (v == null || String(v).trim() === "") continue;
    dated.push({ label, date: parseLooseDate(p[key + "Source2"]), url: String(p[key + "Source1"] ?? "") });
  }
  const dates = dated.map((d) => d.date).filter((d): d is Date => d != null);
  const oldestCited = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  const newestCited = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  const undated = dated.filter((d) => !d.date).map((d) => d.label);
  const checked = check?.checkedAt ? new Date(check.checkedAt) : null;
  // A successful scrub check refreshes the whole model; otherwise the OLDEST cited price sets the age.
  const effective =
    checked && check?.result !== "unreachable" && (!oldestCited || checked > oldestCited) ? checked : oldestCited;
  const age = daysAgo(effective);
  const status: "fresh" | "due" | "stale" | "unknown" =
    age == null ? "unknown" : age <= 30 ? "fresh" : age <= 90 ? "due" : "stale";
  const url = dated.find((d) => /^https?:\/\//.test(d.url))?.url ?? "";
  return { oldestCited, newestCited, undated, checked, result: check?.result, notes: check?.notes, age, status, url };
}

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
  const [priceChecks, setPriceChecks] = useState<Record<string, PriceCheck>>({});

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
        // Price-scrub records are optional; a failure here never blocks the tab.
        const pc = await fetch("/api/admin/price-checks", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null);
        if (!cancelled && pc?.ok && pc.data && typeof pc.data === "object") setPriceChecks(pc.data);
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
      const fresh = priceFreshness(p, priceChecks[String(p.id)]);
      return { id: p.id, name, active, filled, totalFields, missing, score, entry, fresh };
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
  }, [products, priceChecks]);

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

            {/* Price freshness */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-gray-900">Price freshness ({diag.activeRows.length} live models)</h3>
              <p className="mt-1 text-xs text-gray-500">
                Age = days since the oldest cited price was checked (or since the last price-scrub run, if newer).
                Fresh ≤ 30 days · Due 31–90 · Stale &gt; 90. Prices drive Value for Money, so a stale price can mean a wrong score.
              </p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-700">
                    <tr className="text-left">
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2 whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 whitespace-nowrap">Age (days)</th>
                      <th className="px-3 py-2 whitespace-nowrap">Oldest cited price</th>
                      <th className="px-3 py-2 whitespace-nowrap">Newest cited price</th>
                      <th className="px-3 py-2 whitespace-nowrap">Last scrub</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {[...diag.activeRows]
                      .sort((a, b) => (b.fresh.age ?? 1e9) - (a.fresh.age ?? 1e9))
                      .map((r) => {
                        const f = r.fresh;
                        const tone =
                          f.status === "fresh"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : f.status === "due"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-red-50 text-red-800 border-red-200";
                        return (
                          <tr key={r.id} className="text-gray-800">
                            <td className="px-3 py-2 font-medium">
                              {f.url ? (
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {r.name}
                                </a>
                              ) : (
                                r.name
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className={"inline-block rounded border px-2 py-0.5 text-xs font-semibold " + tone}>
                                {f.status === "unknown" ? "No date" : f.status[0].toUpperCase() + f.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono">{f.age ?? "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.oldestCited)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.newestCited)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {f.checked ? fmtDate(f.checked) + " · " + f.result : "Never"}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {[f.undated.length ? "No date on: " + f.undated.join(", ") : "", f.notes ?? ""]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

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
