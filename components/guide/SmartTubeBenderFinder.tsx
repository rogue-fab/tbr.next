'use client';
import * as React from 'react';
import Link from 'next/link';
import { readIds, toggle, subscribe } from '../../lib/compare';

/**
 * Smart Tube Bender Finder.
 *
 * Filters the REAL published models (passed in from the server) against what
 * the buyer needs. Every number shown comes from the same data and score as the
 * reviews. No invented specs, no "% match": a model either meets each stated
 * requirement on its published data or it doesn't, and we say which.
 */

export type FinderModel = {
  id: string;
  slug: string;
  name: string;
  score: number | null;
  priceMin: number | null;
  priceMax: number | null;
  /** Max round-tube OD (inches), null when not published. */
  maxOd: number | null;
  powerType: string | null;
  materials: string[];
  image: string | null;
};

const FALLBACK_IMG = '/images/products/placeholder.png';

const MATERIALS = [
  { value: 'steel', label: 'Mild steel / DOM', match: ['mild steel', 'dom', 'steel'] },
  { value: 'chromoly', label: '4130 chromoly', match: ['chromoly', '4130'] },
  { value: 'stainless', label: 'Stainless steel', match: ['stainless'] },
  { value: 'aluminum', label: 'Aluminum', match: ['aluminum', 'aluminium'] },
  { value: 'copper', label: 'Copper', match: ['copper'] },
  { value: 'titanium', label: 'Titanium', match: ['titanium'] },
] as const;

const POWER = [
  { value: 'any', label: 'No preference', description: 'Show every power type' },
  { value: 'manual', label: 'Manual (hand lever)', description: 'Lowest cost, slowest, most effort' },
  { value: 'air', label: 'Air / hydraulic', description: 'Runs off a shop air compressor' },
  { value: 'electric', label: 'Electric / hydraulic', description: 'Plug-in power unit, fastest cycle' },
] as const;

const BUDGET = [
  { value: 1000, label: 'Under $1,000' },
  { value: 2500, label: 'Up to $2,500' },
  { value: 5000, label: 'Up to $5,000' },
  { value: Infinity, label: 'No limit' },
] as const;

type Answers = {
  od: number;
  material: (typeof MATERIALS)[number]['value'];
  power: (typeof POWER)[number]['value'];
  budget: number;
};

const DEFAULTS: Answers = { od: 1.75, material: 'steel', power: 'any', budget: Infinity };

function fmtOd(n: number) {
  return `${Number(n.toFixed(3))}"`;
}
function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
function fmtPrice(min: number | null, max: number | null) {
  if (min == null && max == null) return 'Not published';
  if (min != null && max != null && Math.round(min) !== Math.round(max)) return `${fmtMoney(min)} – ${fmtMoney(max)}`;
  return fmtMoney((min ?? max) as number);
}

type Check = { ok: boolean; text: string; /** 0 = fits; >0 = how far off (1 = a whole requirement missed). */ miss: number };

function evaluate(m: FinderModel, a: Answers): Check[] {
  const checks: Check[] = [];
  // Diameter
  if (m.maxOd == null) checks.push({ ok: false, text: 'Max tube size not published', miss: 1 });
  else if (m.maxOd >= a.od) checks.push({ ok: true, text: `Rated to ${fmtOd(m.maxOd)} OD (you need ${fmtOd(a.od)})`, miss: 0 });
  else checks.push({ ok: false, text: `Max ${fmtOd(m.maxOd)} OD, smaller than your ${fmtOd(a.od)}`, miss: (a.od - m.maxOd) / a.od });
  // Material
  const mat = MATERIALS.find((x) => x.value === a.material)!;
  const listed = m.materials.map((s) => s.toLowerCase());
  const hasMat = listed.some((s) => mat.match.some((k) => s.includes(k)));
  checks.push(
    hasMat
      ? { ok: true, text: `Maker lists ${mat.label}`, miss: 0 }
      : { ok: false, text: `Maker doesn't list ${mat.label}`, miss: 1 },
  );
  // Power
  if (a.power !== 'any') {
    const p = (m.powerType ?? '').toLowerCase();
    const label = POWER.find((x) => x.value === a.power)!.label;
    checks.push(
      p.includes(a.power)
        ? { ok: true, text: `Offered as ${label.toLowerCase()}`, miss: 0 }
        : { ok: false, text: `Not offered as ${label.toLowerCase()} (${m.powerType || 'power type not published'})`, miss: 1 },
    );
  }
  // Budget (cheapest complete setup)
  if (Number.isFinite(a.budget)) {
    if (m.priceMin == null) checks.push({ ok: false, text: 'Complete-setup price not published', miss: 1 });
    else if (m.priceMin <= a.budget)
      checks.push({ ok: true, text: `Complete setup from ${fmtMoney(m.priceMin)} (budget ${fmtMoney(a.budget)})`, miss: 0 });
    else
      checks.push({
        ok: false,
        text: `Complete setup starts at ${fmtMoney(m.priceMin)}, over your ${fmtMoney(a.budget)}`,
        miss: Math.min(1, (m.priceMin - a.budget) / a.budget),
      });
  }
  return checks;
}

const CompareCTA: React.FC<{ id: string }> = ({ id }) => {
  const [ids, setIds] = React.useState<string[]>([]);
  React.useEffect(() => {
    setIds(readIds());
    return subscribe(() => setIds(readIds()));
  }, []);
  const selected = ids.includes(id);
  return (
    <button
      type="button"
      onClick={() => setIds(toggle(id))}
      aria-pressed={selected}
      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      {selected ? 'Added to compare ✓' : 'Compare'}
    </button>
  );
};

function ModelCard({ m, checks }: { m: FinderModel; checks: Check[] }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 flex flex-col sm:flex-row gap-4">
      <div className="h-24 w-full sm:w-36 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.image || FALLBACK_IMG} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{m.name}</h3>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {m.score != null ? `${m.score} / 100` : 'Not scored'}
          </span>
        </div>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-1 text-sm text-gray-600 dark:text-gray-400">
          <div>Max OD: <span className="font-medium text-gray-900 dark:text-gray-100">{m.maxOd != null ? fmtOd(m.maxOd) : '—'}</span></div>
          <div>Complete setup: <span className="font-medium text-gray-900 dark:text-gray-100">{fmtPrice(m.priceMin, m.priceMax)}</span></div>
          <div>Power: <span className="font-medium text-gray-900 dark:text-gray-100">{m.powerType || '—'}</span></div>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {checks.map((c) => (
            <li key={c.text} className={c.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
              {c.ok ? '✓' : '✗'} {c.text}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/reviews/${m.slug}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Read the review
          </Link>
          <CompareCTA id={m.id} />
        </div>
      </div>
    </div>
  );
}

function OptionList<T extends string | number>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { value: T; label: string; description?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((o) => (
        <label
          key={String(o.value)}
          className={`flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
            o.value === value ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
          />
          <div className="ml-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">{o.label}</span>
            {o.description && <span className="text-sm text-gray-500 dark:text-gray-400">{o.description}</span>}
          </div>
        </label>
      ))}
    </div>
  );
}

const STEPS = 4;

export function SmartTubeBenderFinder({ models }: { models: FinderModel[] }) {
  const [step, setStep] = React.useState(1);
  const [a, setA] = React.useState<Answers>(DEFAULTS);
  const [showResults, setShowResults] = React.useState(false);
  const top = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo(() => {
    const rows = models.map((m) => ({ m, checks: evaluate(m, a) }));
    const byScore = (x: { m: FinderModel }, y: { m: FinderModel }) => (y.m.score ?? -1) - (x.m.score ?? -1);
    const matches = rows.filter((r) => r.checks.every((c) => c.ok)).sort(byScore);
    // Closest misses first: fewest/smallest gaps (e.g. 2.5" beats 2" when you asked for 3"), then score.
    const gap = (r: { checks: Check[] }) => r.checks.reduce((s, c) => s + c.miss, 0);
    const near = rows
      .filter((r) => !r.checks.every((c) => c.ok))
      .sort((x, y) => gap(x) - gap(y) || byScore(x, y))
      .slice(0, 3);
    return { matches, near };
  }, [models, a]);

  const go = (s: number) => {
    setStep(s);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const reset = () => {
    setA(DEFAULTS);
    setShowResults(false);
    go(1);
  };

  if (showResults) {
    const power = POWER.find((x) => x.value === a.power)!.label;
    const budget = BUDGET.find((x) => x.value === a.budget)!.label;
    const mat = MATERIALS.find((x) => x.value === a.material)!.label;
    return (
      <div ref={top} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {results.matches.length} of {models.length} models fit
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          You asked for: {fmtOd(a.od)} OD · {mat} · {power} · {budget}. Matches are sorted by score. Everything shown is the
          maker&apos;s published data, the same data behind each review.
        </p>
        <div className="mt-6 space-y-4">
          {results.matches.map((r) => (
            <ModelCard key={r.m.id} m={r.m} checks={r.checks} />
          ))}
          {results.matches.length === 0 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              No model meets every requirement on its published data. The closest ones are below, with what doesn&apos;t fit.
            </p>
          )}
        </div>
        {results.near.length > 0 && (
          <>
            <h3 className="mt-10 text-lg font-semibold text-gray-900 dark:text-gray-100">Close, but not a full fit</h3>
            <div className="mt-4 space-y-4">
              {results.near.map((r) => (
                <ModelCard key={r.m.id} m={r.m} checks={r.checks} />
              ))}
            </div>
          </>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowResults(false)}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Change answers
          </button>
          <button type="button" onClick={reset} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium">
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={top} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 sm:p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Smart Tube Bender Finder</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Step {step} of {STEPS}
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(step / STEPS) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {step === 1 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">What&apos;s the largest tube you&apos;ll bend?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Outside diameter of round tube. We only show machines rated for at least this size.</p>
            <label className="block">
              <span className="sr-only">Tube outside diameter in inches</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.125"
                value={a.od}
                onChange={(e) => setA({ ...a, od: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span>0.5&quot;</span>
                <span className="font-semibold text-blue-600 text-base">{fmtOd(a.od)} OD</span>
                <span>3&quot;</span>
              </div>
            </label>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">What material will you bend most?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">We match against the materials each maker lists for the machine.</p>
            <OptionList name="material" options={MATERIALS} value={a.material} onChange={(v) => setA({ ...a, material: v })} />
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">How do you want to power it?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">A model counts if the maker offers it with that power option.</p>
            <OptionList name="power" options={POWER} value={a.power} onChange={(v) => setA({ ...a, power: v })} />
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">What&apos;s your budget for a complete setup?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Frame + one die + power + stand, at the cheapest published configuration.
            </p>
            <OptionList name="budget" options={BUDGET} value={a.budget} onChange={(v) => setA({ ...a, budget: v })} />
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 1}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {step < STEPS ? (
            <button type="button" onClick={() => go(step + 1)} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowResults(true);
                top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
            >
              Show matching benders
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
