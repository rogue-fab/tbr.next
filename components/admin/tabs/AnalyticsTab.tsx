"use client";

import { useEffect, useState } from "react";

type Summary = {
  total: number;
  last7: number;
  last24h: number;
  visitors24h: number;
  visitors7: number;
  outbound7: number;
  topCampaigns: { source: string; views: number }[];
  topOutbound: { host: string; views: number }[];
  outboundByPage: { path: string; views: number }[];
  topPages: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
  topCountries: { country: string; views: number }[];
  devices: { device: string; views: number }[];
  byDay: { day: string; views: number; visitors: number }[];
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
  const [setupSql, setSetupSql] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
        setHint(json?.setupSql ? null : json?.hint || null);
        setSetupSql(json?.setupSql || null);
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
            {setupSql && (
              <div className="mt-3 text-xs">
                <p>
                  One-time fix: open the Neon console → SQL Editor, choose the <span className="font-semibold">owner</span>{" "}
                  role (the site's own role can&apos;t create tables), paste this, and run it. Tracking starts on the next
                  page view; nothing needs a redeploy.
                </p>
                <pre className="mt-2 overflow-x-auto rounded border border-amber-300 bg-white p-3 font-mono text-[11px] text-gray-800">
                  {setupSql}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(setupSql).then(() => setCopied(true));
                  }}
                  className="mt-2 mr-2 rounded border border-amber-400 bg-white px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  {copied ? "Copied ✓" : "Copy SQL"}
                </button>
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Stat label="Visitors (24h)" value={data.visitors24h} />
              <Stat label="Visitor-days (7 days)" value={data.visitors7} />
              <Stat label="Clicks to makers (7 days)" value={data.outbound7} />
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
                      title={`${d.day}: ${d.views} views, ${d.visitors} visitors`}
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
              <RankTable title="Clicks out to (site)" rows={data.topOutbound} keyName="host" />
              <RankTable title="Clicks out from (page)" rows={data.outboundByPage} keyName="path" />
              <RankTable title="Campaigns (utm_source / utm_campaign)" rows={data.topCampaigns} keyName="source" />
            </div>

            <p className="mt-6 text-[0.7rem] text-gray-400">
              Tracks pageviews, anonymous daily visitors (a hash that resets every day; no cookies, no stored IPs),
              clicks out to other sites, UTM campaigns, referrers, country and device. Known bots are skipped.
              Search keywords come from Google Search Console, not from on-site analytics.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
