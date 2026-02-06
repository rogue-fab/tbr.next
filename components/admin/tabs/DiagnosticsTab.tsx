"use client";

import { useEffect, useMemo, useState } from "react";

type AutoscaleOffender = {
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

type AutoscaleValueDiag = {
  status: "ok" | "warning" | "error";
  band?: { valueP10: number; valueP90: number };
  counts?: {
    totalProductsSeen: number;
    eligibleProducts: number;
    offendersBelowP10: number;
    offendersAboveP90: number;
  };
  offenders?: {
    belowP10: AutoscaleOffender[];
    aboveP90: AutoscaleOffender[];
  };
  entryPriceOutliers?: {
    suspiciousThreshold: number;
    suspiciousCount: number;
    lowest: EligibleRow[];
    highest: EligibleRow[];
  };
  errors?: string[];
};

function formatMoney(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatNumber(n: unknown, digits = 2): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatRawValue(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  // rawValue can span many orders of magnitude; exponential is the most honest display.
  return v.toExponential(3);
}

function StatusPill({ status }: { status: "ok" | "warning" | "error" | "loading" }) {
  const cfg = useMemo(() => {
    switch (status) {
      case "ok":
        return { label: "OK", cls: "bg-green-100 text-green-800 border-green-200" };
      case "warning":
        return { label: "Warning", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" };
      case "error":
        return { label: "Error", cls: "bg-red-100 text-red-800 border-red-200" };
      case "loading":
      default:
        return { label: "Loading", cls: "bg-gray-100 text-gray-800 border-gray-200" };
    }
  }, [status]);

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function EntryPriceOutliersPanel({
  outliers,
}: {
  outliers: AutoscaleValueDiag["entryPriceOutliers"];
}) {
  if (!outliers) return null;

  const { suspiciousThreshold, suspiciousCount, lowest, highest } = outliers;

  const Table = ({ title, rows }: { title: string; rows: EligibleRow[] }) => {
    if (!rows?.length) return null;
    return (
      <div className="mt-3">
        <h5 className="text-sm font-semibold text-gray-900">{title}</h5>
        <div className="mt-2 overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-700">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Entry Price</th>
                <th className="px-3 py-2">Capability Pts</th>
                <th className="px-3 py-2">rawValue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((r) => (
                <tr key={`${title}-${r.id}`} className="text-gray-900">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{r.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.brand ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.model ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatMoney(r.entryPrice)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatNumber(r.capabilityPoints, 0)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{formatRawValue(r.rawValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900">Entry Price Outliers (eligible products only)</h4>
      <p className="mt-1 text-xs text-gray-600 max-w-4xl">
        This panel is a sanity check for pricing parses. If you see absurd values (e.g., hundreds of thousands or millions),
        the autoscale warning is a symptom — the root cause is usually units/format parsing upstream.
      </p>
      {suspiciousCount > 0 ? (
        <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
          Suspicious pricing detected: {suspiciousCount} eligible products have entryPrice ≥ {formatMoney(suspiciousThreshold)}.
          This is usually a parse/units bug (cents vs dollars, commas/decimals, or unintended multipliers).
        </div>
      ) : null}
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <Table title="Lowest entryPrice (top 5)" rows={lowest ?? []} />
        </div>
        <div>
          <Table title="Highest entryPrice (top 5)" rows={highest ?? []} />
        </div>
      </div>
    </div>
  );
}

function OffendersTable({ title, rows }: { title: string; rows: AutoscaleOffender[] }) {
  if (!rows?.length) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <div className="mt-2 overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-700">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2">Entry Price</th>
              <th className="px-3 py-2">Capability Pts</th>
              <th className="px-3 py-2">rawValue</th>
              <th className="px-3 py-2">Value Score</th>
              <th className="px-3 py-2">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((r) => (
              <tr key={r.id} className="text-gray-900">
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{r.id}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.brand ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.model ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatMoney(r.entryPrice)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatNumber(r.capabilityPoints, 0)}</td>
                <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{formatRawValue(r.rawValue)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.valueScore === null ? "—" : formatNumber(r.valueScore, 2)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.totalScore === null ? "—" : formatNumber(r.totalScore, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DiagnosticsTab() {
  const [loading, setLoading] = useState(true);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [data, setData] = useState<AutoscaleValueDiag | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setHttpError(null);

        const res = await fetch("/api/admin/diagnostics/autoscale-value", { method: "GET" });
        const bodyText = await res.text();

        let json: AutoscaleValueDiag | null = null;
        try {
          json = bodyText ? (JSON.parse(bodyText) as AutoscaleValueDiag) : null;
        } catch {
          json = null;
        }

        if (!res.ok) {
          const msg =
            (json?.errors && json.errors.length ? json.errors.join(" | ") : null) ||
            `HTTP ${res.status} ${res.statusText}. Non-JSON response: ${bodyText.slice(0, 120)}`;
          if (!cancelled) {
            setData(json ?? { status: "error", errors: [msg] });
            setHttpError(msg);
          }
          return;
        }

        if (!json) {
          const msg = `Expected JSON from /api/admin/diagnostics/autoscale-value but received non-JSON response: ${bodyText.slice(0, 120)}`;
          if (!cancelled) {
            setData({ status: "error", errors: [msg] });
            setHttpError(msg);
          }
          return;
        }

        if (!cancelled) setData(json);
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : "Unknown error";
        if (!cancelled) {
          setData({ status: "error", errors: [msg] });
          setHttpError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const status: "ok" | "warning" | "error" | "loading" = loading
    ? "loading"
    : httpError
      ? "error"
      : data?.status ?? "error";

  const band = data?.band;
  const counts = data?.counts;
  const offendersBelow = data?.offenders?.belowP10 ?? [];
  const offendersAbove = data?.offenders?.aboveP90 ?? [];
  const entryPriceOutliers = data?.entryPriceOutliers;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Diagnostics</h2>
        <p className="text-sm text-gray-500">System diagnostics and health checks</p>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Autoscale Safety (Value for Money)</h3>
            <p className="text-sm text-gray-600 mt-1">
              Verifies the committed snapshot band (P10/P90) is valid against current eligible products
              (entryPrice &gt; 0 and capabilityPoints &gt; 0). Read-only. No inference.
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        {status === "error" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">
              ERROR: Value autoscale snapshot is missing/invalid or safety check failed.
            </p>
            <p className="text-sm text-red-900 mt-1">
              This should be treated as unsafe until resolved. No silent fallbacks.
            </p>
            {data?.errors?.length ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-red-900">
                {data.errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-900 mt-2">{httpError ?? "Unknown error"}</p>
            )}
          </div>
        )}

        {status !== "loading" && status !== "error" && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900">Snapshot Band</h4>
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">valueP10</span>
                  <span className="font-mono text-xs">{band ? formatRawValue(band.valueP10) : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">valueP90</span>
                  <span className="font-mono text-xs">{band ? formatRawValue(band.valueP90) : "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900">Counts</h4>
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">totalProductsSeen</span>
                  <span className="font-mono text-xs">{counts ? String(counts.totalProductsSeen) : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">eligibleProducts</span>
                  <span className="font-mono text-xs">{counts ? String(counts.eligibleProducts) : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">offendersBelowP10</span>
                  <span className="font-mono text-xs">{counts ? String(counts.offendersBelowP10) : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">offendersAboveP90</span>
                  <span className="font-mono text-xs">{counts ? String(counts.offendersAboveP90) : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === "warning" && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-900">
              Warning: Some eligible products fall outside the committed snapshot band.
            </p>
            <p className="text-sm text-yellow-900 mt-1">
              This is not automatically a bug — it indicates data drift or extreme outliers. Investigate the offenders.
            </p>
          </div>
        )}

        {status !== "loading" && status !== "error" && (
          <>
            <EntryPriceOutliersPanel outliers={entryPriceOutliers} />
            <OffendersTable title="Offenders Below P10 (rawValue < valueP10)" rows={offendersBelow} />
            <OffendersTable title="Offenders Above P90 (rawValue > valueP90)" rows={offendersAbove} />
          </>
        )}
      </div>
    </div>
  );
}

