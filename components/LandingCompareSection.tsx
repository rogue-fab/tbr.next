'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { TOTAL_POINTS } from "../lib/scoring";
import type { MandrelTier } from "../lib/validators";

const FALLBACK_IMG = "/images/products/placeholder.png";

export type LandingCompareRow = {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  model?: string;
  score: number | null;
  priceMin: number | null;
  priceMax: number | null;
  maxCapacity?: string | null;
  powerType?: string | null;
  country?: string | null;
  mandrel?: string | null;
  sBend?: boolean | null;
  /** Optional product image; falls back if missing */
  image?: string | null;
};

type Props = {
  rows: LandingCompareRow[];
};

/** Simple USD formatting for price ranges. */
function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  const fmt = (v: number | null) =>
    v == null || !Number.isFinite(v)
      ? null
      : `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const lo = fmt(min);
  const hi = fmt(max);
  if (lo && hi) return `${lo} – ${hi}`;
  return lo ?? hi ?? "—";
}

function normalizePower(powerType?: string | null): "manual" | "hydraulic" | "other" | "unknown" {
  const s = (powerType ?? "").toLowerCase();
  if (!s) return "unknown";
  if (s.includes("manual") && s.includes("hydraulic")) return "other";
  if (s.includes("manual")) return "manual";
  if (s.includes("hydraulic") || s.includes("electric") || s.includes("air")) return "hydraulic";
  return "other";
}

function normalizeMandrelTier(v?: MandrelTier | string | null): MandrelTier | "unknown" {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "none";
  if (s === "none" || s === "no" || s === "not available" || s === "n/a") return "none";
  if (s === "economy") return "economy";
  if (s === "bronze") return "bronze";

  // Legacy labels (FTC-safe direction: preserve intent, but never "upgrade" unknowns).
  if (s === "available" || s === "standard") return "bronze";
  if (s.includes("nickel") || s.includes("bronze") || s.includes("brass")) return "bronze";
  if (s.includes("plastic") || s.includes("aluminum") || s.includes("aluminium") || s.includes("steel"))
    return "economy";

  return "unknown";
}

function isMandrelOn(mandrel?: MandrelTier | string | null): boolean {
  const t = normalizeMandrelTier(mandrel);
  return t === "bronze" || t === "economy";
}

function MandrelPill({ value }: { value?: MandrelTier | string | null }) {
  const t = normalizeMandrelTier(value);

  if (t === "bronze") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-emerald-50 border-emerald-400 text-emerald-700">
        Bronze Mandrel
      </span>
    );
  }

  if (t === "economy") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-amber-50 border-amber-400 text-amber-800">
        Economy Mandrel
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
      No Mandrel
    </span>
  );
}

function SBendPill({ value }: { value?: boolean | null }) {
  if (value === true) {
    return (
      <span
        className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5
                   text-[11px] font-medium border
                   bg-emerald-50 border-emerald-400 text-emerald-700"
      >
        S-bending
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5
                 text-[11px] font-medium border
                 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
    >
      No S-bends
    </span>
  );
}

function ScoreCircle({ score, href }: { score: number | null; href: string }) {
  const clamped =
    score == null
      ? null
      : Math.max(0, Math.min(TOTAL_POINTS, Math.round(score)));

  // Slightly larger circle than before
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const ratio = clamped == null ? 0 : clamped / TOTAL_POINTS;
  const dash = circumference * ratio;

  // 0–59 = red, 60–79 = yellow, 80–100 = green
  let color = "#9ca3af"; // neutral gray fallback
  if (clamped != null) {
    if (clamped >= 80) color = "#22c55e";        // green
    else if (clamped >= 60) color = "#f59e0b";   // yellow
    else color = "#ef4444";                      // red
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="relative h-14 w-14">
        <svg
          viewBox="0 0 52 52"
          className="h-14 w-14"
          aria-hidden="true"
        >
          <circle
            cx="26"
            cy="26"
            r={radius}
            stroke="#e5e7eb" // track
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="26"
            cy="26"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - dash}
            strokeLinecap="round"
          />
        </svg>

        {/* Centered score text */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <span className="text-xs font-semibold" style={{ color }}>
            {clamped != null ? clamped : "—"}
          </span>
          <span className="text-[0.6rem] text-gray-500 dark:text-gray-400">/ {TOTAL_POINTS}</span>
        </div>
      </div>

      {/* Link to review page with score flag for future auto-expand */}
      <Link
        href={href}
        className="text-[0.7rem] font-medium text-blue-600 underline hover:text-blue-700"
      >
        Pt. details
      </Link>
    </div>
  );
}

/** Rank badge (#1 trophy, #2 silver, #3 bronze, others simple). */
function RankBadge({ rank }: { rank: number }) {
  let icon = "🏆";
  let bg = "bg-amber-50 border-amber-300 text-amber-700";

  if (rank === 2) {
    icon = "🥈";
    bg = "bg-slate-50 border-slate-300 text-slate-700";
  } else if (rank === 3) {
    icon = "🥉";
    bg = "bg-orange-50 border-orange-300 text-orange-700";
  } else if (rank > 3) {
    icon = "★";
    bg = "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400";
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        bg,
      ].join(" ")}
    >
      <span aria-hidden="true">{icon}</span>
      <span>#{rank}</span>
    </span>
  );
}

function Pill({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        active
          ? "bg-emerald-50 border-emerald-400 text-emerald-700"
          : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function LandingCompareSection({ rows }: Props) {
  const [minScore, setMinScore] = useState<number>(0);
  const [power, setPower] = useState<"any" | "manual" | "hydraulic">("any");
  const [origin, setOrigin] = useState<"any" | "usaOnly">("any");
  const [mandrelOnly, setMandrelOnly] = useState(false);

  const filtered = useMemo(() => {
    const list = rows.slice().sort((a, b) => {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      if (sa === sb) return a.name.localeCompare(b.name);
      return sb - sa;
    });

    return list.filter((row) => {
      if (minScore > 0 && (row.score ?? 0) < minScore) return false;

      const normPower = normalizePower(row.powerType);
      if (power === "manual" && normPower !== "manual") return false;
      if (power === "hydraulic" && normPower !== "hydraulic") return false;

      const c = (row.country ?? "").toLowerCase();
      if (
        origin === "usaOnly" &&
        c &&
        c !== "usa" &&
        c !== "united states" &&
        c !== "united states of america"
      ) {
        return false;
      }

      if (mandrelOnly && !isMandrelOn(row.mandrel)) return false;

      return true;
    });
  }, [rows, minScore, power, origin, mandrelOnly]);

  return (
    <section className="mt-12 rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tube Bender Comparison</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Products ranked by our 100-point scoring system — highest rated first.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden sm:inline-block text-[0.7rem] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Filters
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">Min score</span>
              <select
                className="rounded border border-gray-300 bg-white dark:bg-gray-900 px-2 py-1"
                value={String(minScore)}
                onChange={(e) => setMinScore(Number(e.target.value) || 0)}
              >
                <option value="0">Any</option>
                <option value="60">60+</option>
                <option value="70">70+</option>
                <option value="80">80+</option>
                <option value="90">90+</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">Power</span>
              <select
                className="rounded border border-gray-300 bg-white dark:bg-gray-900 px-2 py-1"
                value={power}
                onChange={(e) => setPower(e.target.value as typeof power)}
              >
                <option value="any">Any</option>
                <option value="manual">Manual</option>
                <option value="hydraulic">Hydraulic</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">Origin</span>
              <select
                className="rounded border border-gray-300 bg-white dark:bg-gray-900 px-2 py-1"
                value={origin}
                onChange={(e) => setOrigin(e.target.value as typeof origin)}
              >
                <option value="any">Any</option>
                <option value="usaOnly">USA only</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={mandrelOnly}
                onChange={(e) => setMandrelOnly(e.target.checked)}
              />
              <span className="text-gray-600 dark:text-gray-400">Mandrel-ready only</span>
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[820px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Rating</th>
              <th className="px-3 py-2 text-left">Price (complete setup)</th>
              <th className="px-3 py-2 text-left">Max Diameter</th>
              <th className="px-3 py-2 text-left">Power</th>
              <th className="px-3 py-2 text-left">Made in</th>
              <th className="px-3 py-2 text-left">Mandrel</th>
              <th className="px-3 py-2 text-left">S-bend</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No models match the current filters. Try relaxing your filters.
                </td>
              </tr>
            )}
            {filtered.map((row, index) => {
              const rank = index + 1;
              const imgSrc = row.image || FALLBACK_IMG;
              return (
                <tr
                  key={row.id}
                  className={index % 2 === 1 ? "bg-gray-50/40" : ""}
                >
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block">
                        <RankBadge rank={rank} />
                      </div>
                      <div className="h-14 w-20 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgSrc}
                          alt={row.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col">
                        <Link
                          href={`/reviews/${row.slug}`}
                          className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline"
                        >
                          {row.name}
                        </Link>
                        {(row.brand || row.model) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {[row.brand, row.model].filter(Boolean).join(" ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <ScoreCircle
                      score={row.score}
                      href={`/reviews/${row.slug}?score=details`}
                    />
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">
                    {formatPriceRange(row.priceMin, row.priceMax)}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">
                    {row.maxCapacity || "—"}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">
                    {row.powerType || "—"}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">
                    {row.country || "—"}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <MandrelPill value={row.mandrel} />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <SBendPill value={row.sBend} />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Link
                      href={`/reviews/${row.slug}`}
                      className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
