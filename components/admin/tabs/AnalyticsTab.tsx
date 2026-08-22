"use client";

import { useEffect, useState } from "react";

type Summary = {
  total: number;
  last7: number;
  last24h: number;
  topPages: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
  topCountries: { country: string; views: number }[];
  devices: { device: string; views: number }[];
  byDay: { day: string; views: number }[];
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-600">{label}</div>
    </div>
  );
}

function RankTable({
  title,
  rows,
  keyName,
}: {
  title: string;
  rows: { views: number; [k: string]: any }[];
  keyName: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <div className="mt-2 space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-400">No data yet.</p>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="relative">
              <div
                className="absolute inset-y-0 left-0 rounded bg-indigo-50"
                style={{ width: `${(r.views / max) * 100}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-center justify-between px-2 py-1 text-xs">
                <span className="truncate text-gray-800">{String(r[keyName])}</span>
                <span className="ml-2 shrink-0 font-mono text-gray-600">{r.views}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [data, setData] = useState<Summary | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.error || `Failed to load analytics (${res.status}).`);
        setHint(json?.hint || null);
        return;
      }
      setData(json.data);
    } catch {
      setError("Failed to load analytics (network error).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const maxDay = data ? Math.max(1, ...data.byDay.map((d) => d.views)) : 1;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500">
          First-party traffic — privacy-respecting (no cookies, no IPs stored; country comes from the
          edge, not the visitor&apos;s IP).
        </p>
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">{error}</div>
            {hint && <div className="mt-1 text-xs">{hint}</div>}
            <button
              type="button"
              onClick={load}
              className="mt-2 rounded border border-amber-400 bg-white px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Views (24h)" value={data.last24h} />
              <Stat label="Views (7 days)" value={data.last7} />
              <Stat label="Views (all time)" value={data.total} />
            </div>

            {/* 30-day trend */}
            <div className="mt-5 rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900">Last 30 days</h4>
              {data.byDay.length === 0 ? (
                <p className="mt-2 text-xs text-gray-400">No data yet.</p>
              ) : (
                <div className="mt-3 flex h-24 items-end gap-0.5">
                  {data.byDay.map((d) => (
                    <div
                      key={d.day}
                      className="flex-1 rounded-t bg-indigo-400 hover:bg-indigo-500"
                      style={{ height: `${Math.max(4, (d.views / maxDay) * 100)}%` }}
                      title={`${d.day}: ${d.views}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <RankTable title="Top pages" rows={data.topPages} keyName="path" />
              <RankTable title="Top countries" rows={data.topCountries} keyName="country" />
              <RankTable title="Top referrers" rows={data.topReferrers} keyName="host" />
              <RankTable title="Devices" rows={data.devices} keyName="device" />
            </div>

            <p className="mt-6 text-[0.7rem] text-gray-400">
              This tracks pageviews, geography, referrers, and device class. For deeper behavior —
              time on page, scroll depth, funnels, real-time — enable Vercel Analytics (one toggle in
              the Vercel dashboard) or GA4; they complement this without replacing it.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
