// components/ScoringAndSources.tsx
//
// The single per-model "how every point was earned" section. For each of the
// scoring categories it shows, stacked:
//   (a) the score        — points / max, colored
//   (b) how it's scored  — the method (same info as /scoring)
//   (c) this machine     — the model-specific reasoning
//   (d) sources          — the citations backing that category's data
//
// Native <details> per row (no client JS): scan the scores, click any to see
// the full justification + proof. Replaces the old duplicate score breakdowns
// and the separate citation panel.

import { SCORING_CATEGORIES, TOTAL_POINTS, type ProductScore } from "../lib/scoring";
import {
  SCORING_EXPLAINERS,
  CATEGORY_CITATION_FIELDS,
  CITATION_FIELD_LABELS,
} from "../lib/scoringExplainers";

type Props = {
  score: ProductScore;
  /** Merged product (base + published overlay), carrying the <field>Source* citation keys. */
  product: Record<string, any>;
};

type Citation = {
  field: string;
  label: string;
  value: string;
  source: string;
  accessed: string;
  notes: string;
  by: string;
};

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function citationsForCategory(
  product: Record<string, any>,
  catKey: string,
): Citation[] {
  const fields = CATEGORY_CITATION_FIELDS[catKey] ?? [];
  const out: Citation[] = [];
  for (const f of fields) {
    const source = str(product[`${f}Source1`]);
    const accessed = str(product[`${f}Source2`]);
    const notes = str(product[`${f}Notes`]);
    const by = str(product[`${f}UserCode`]);
    if (!source && !accessed && !notes && !by) continue; // no proof recorded yet
    out.push({
      field: f,
      label: CITATION_FIELD_LABELS[f] ?? f,
      value: str(product[f]),
      source,
      accessed,
      notes,
      by,
    });
  }
  return out;
}

function badgeClass(points: number, max: number): string {
  if (!max) return "bg-gray-300 text-gray-800";
  const r = points / max;
  if (r >= 0.8) return "bg-emerald-500 text-white";
  if (r >= 0.6) return "bg-amber-400 text-gray-900";
  if (r >= 0.4) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

export default function ScoringAndSources({ score, product }: Props) {
  const breakdown = Array.isArray(score?.breakdown) ? score.breakdown : [];
  const byKey = new Map<string, (typeof breakdown)[number]>();
  for (const item of breakdown) {
    const k = (item as any)?.key;
    if (typeof k === "string" && k.trim() !== "") byKey.set(k, item);
  }

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          How this score was earned — every point, with sources
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {score?.total ?? "—"} / {TOTAL_POINTS}
        </span>
      </div>
      <p className="mt-1 text-[0.72rem] text-gray-600 dark:text-gray-400">
        Each line shows the points, exactly how that category is scored, how this
        machine did, and the sources behind the data. Click any line to expand.
      </p>

      <div className="mt-3 divide-y divide-gray-200 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {SCORING_CATEGORIES.map((cat) => {
          const hit = byKey.get(cat.key);
          const pts = hit?.points ?? 0;
          const max = hit?.maxPoints ?? cat.maxPoints ?? 0;
          const cites = citationsForCategory(product, cat.key);
          const explainer = SCORING_EXPLAINERS[cat.key] ?? "";

          return (
            <details key={cat.key} className="group px-3 py-2">
              <summary className="flex cursor-pointer select-none items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span className="text-gray-400 transition group-open:rotate-90" aria-hidden="true">
                    ▶
                  </span>
                  {cat.name}
                </span>
                <span className="flex items-center gap-2">
                  {cites.length > 0 ? (
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      {cites.length} source{cites.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="text-[0.6rem] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      no source yet
                    </span>
                  )}
                  <span
                    className={`inline-flex min-w-[3rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(
                      pts,
                      max,
                    )}`}
                  >
                    {pts}/{max}
                  </span>
                </span>
              </summary>

              <div className="mt-2 space-y-2 pl-5 text-xs">
                {explainer && (
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300">How it&apos;s scored</div>
                    <p className="text-gray-600 dark:text-gray-400">{explainer}</p>
                  </div>
                )}
                {hit?.reasoning && (
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300">This machine</div>
                    <p className="text-gray-600 dark:text-gray-400">{hit.reasoning}</p>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Sources</div>
                  {cites.length === 0 ? (
                    <p className="text-gray-400 dark:text-gray-500">No source recorded for this category yet.</p>
                  ) : (
                    <ul className="mt-1 space-y-1.5">
                      {cites.map((c) => (
                        <li
                          key={c.field}
                          className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2 text-gray-800 dark:text-gray-200">
                            <span className="font-semibold">{c.label}</span>
                            {c.value && <span className="text-gray-500 dark:text-gray-400">= {c.value}</span>}
                          </div>
                          {c.source && (
                            <div className="mt-0.5 break-all text-gray-600 dark:text-gray-400">
                              {/^https?:\/\//i.test(c.source) ? (
                                <a
                                  href={c.source}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="text-blue-600 dark:text-blue-400 underline"
                                >
                                  {c.source}
                                </a>
                              ) : (
                                c.source
                              )}
                            </div>
                          )}
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[0.65rem] text-gray-400 dark:text-gray-500">
                            {c.accessed && <span>Accessed {c.accessed}</span>}
                            {c.by && <span>Verified by {c.by}</span>}
                            {c.notes && <span className="text-gray-500 dark:text-gray-400">{c.notes}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {product.citationsRaw ? (
        <details className="mt-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
          <summary className="cursor-pointer text-[0.72rem] font-medium text-gray-700 dark:text-gray-300">
            Raw citation log
          </summary>
          <pre className="mt-2 max-h-52 overflow-auto rounded bg-white dark:bg-gray-900 px-2 py-1 text-[0.65rem] text-gray-800 dark:text-gray-200">
            {String(product.citationsRaw).trim()}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
