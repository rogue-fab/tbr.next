import React from "react";
import Link from "next/link";
import { getAllTubeBendersWithOverlay, findTubeBenderWithOverlay } from "../../../lib/catalogOverlay";
import { generateAutoProsCons } from "../../../lib/proCons";
import { slugOf, titleOf, slugForProduct } from "../../../lib/ids";
import { getProductScore, TOTAL_POINTS } from "../../../lib/scoring";
import ScoringAndSources from "../../../components/ScoringAndSources";
import JsonLd from "../../../components/JsonLd";
import { reviewJsonLd, breadcrumbJsonLd } from "../../../lib/jsonld";
import { siteBase } from "../../../lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fallbackImg = "/images/products/placeholder.png";

/**
 * Derive a filesystem-safe image path from a product slug or id.
 *
 * Rules:
 * - Lowercase
 * - Only allow [a–z0–9-]
 * - Replace all other characters with "-"
 * - Collapse repeated "-" and trim from ends
 * - Final path: /images/products/{safe-slug}.jpg
 *
 * If everything sanitizes to an empty string, fall back to a shared placeholder.
 */
function imagePathForSlug(slugOrId: string | null | undefined): string {
  const raw = (slugOrId ?? "").toLowerCase().trim();
  if (!raw) return fallbackImg;

  const safe = raw
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!safe) return fallbackImg;

  return `/images/products/${safe}.jpg`;
}

type Product = {
  id: string;
  slug?: string;
  name?: string;
  brand?: string;
  model?: string;
  image?: string;
  highlights?: string[];
  // Safe optional fields that may exist in the catalog:
  type?: string;
  country?: string;
  usaClaim?: string;
  maxCapacity?: string | number;
  capacity?: string | number;
  max_od?: string | number;
  maxWall?: string | number;
  weight?: string | number;
  dimensions?: string;
  warranty?: string;
  // Legacy flat price (entry setup); we prefer component pricing for UI.
  price?: string | number;
  // Pricing breakdown from admin overlay:
  framePriceMin?: string | number;
  framePriceMax?: string | number;
  diePriceMin?: string | number;
  diePriceMax?: string | number;
  hydraulicPriceMin?: string | number;
  hydraulicPriceMax?: string | number;
  standPriceMin?: string | number;
  standPriceMax?: string | number;
};

/** Build a lookup by multiple keys (id, slug, name, brand+model). */
function buildLookup(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const p of products) {
    const candidates = new Set<string>();
    if (p.id) candidates.add(p.id);
    if (p.slug) candidates.add(p.slug);
    if (p.name) candidates.add(p.name);
    const bm = [p.brand, p.model].filter(Boolean).join(" ");
    if (bm) candidates.add(bm);
    for (const c of candidates) map.set(slugOf(c), p);
  }
  return map;
}

// Expose core specs but omit raw "price" – pricing snapshot below shows min/max system totals.
const SAFE_FIELDS: Array<keyof Product> = [
  "brand",
  "model",
  "type",
  "usaClaim",
  "capacity",
  "max_od",
  "maxWall",
  "weight",
  "dimensions",
  "warranty",
];

/** Human label for a spec key. */
function labelFor(k: keyof Product): string {
  const map: Record<string,string> = {
    brand: "Brand",
    model: "Model",
    type: "Type",
    // Explicitly disclosed as claimed by the manufacturer, not independently audited.
    country: "Country of manufacture (claimed)",
    usaClaim: "USA origin claim",
    capacity: "Capacity",
    max_od: "Max OD",
    maxWall: "Max Wall",
    weight: "Weight",
    dimensions: "Dimensions",
    warranty: "Warranty",
  };
  return map[k] ?? String(k);
}

type PageProps = {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params.slug;
  const product = (await findTubeBenderWithOverlay(
    (b) =>
      slugOf(b.id) === slugOf(slug) ||
      slugOf((b as any).slug ?? "") === slugOf(slug) ||
      slugForProduct(b as any) === slug,
  )) as Product | undefined;

  if (!product) {
    return { title: "Review not found | TubeBenderReviews" };
  }

  const title = titleOf(product as any);
  const { total } = getProductScore(product as any);
  const base = siteBase();
  const url = `${base}/reviews/${slugForProduct(product as any)}`;
  const scored = typeof total === "number" ? ` — ${total}/100` : "";
  const scoredPhrase = typeof total === "number" ? `Scored ${total}/100. ` : "";
  const description = `${scoredPhrase}${title} review: full spec breakdown, transparent 100-point scoring, and cited sources — capacity, tooling cost, mandrel, S-bend, and value for money.`;
  const rawImg = imagePathForSlug((product as any).slug ?? (product as any).id);
  const image = /^https?:\/\//i.test(rawImg) ? rawImg : `${base}${rawImg}`;

  return {
    title: `${title} Review${scored}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${title} Review${scored}`,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} Review${scored}`,
      description,
      images: [image],
    },
  };
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  // Read from the merged catalog so admin overlay edits are reflected.
  const all = await getAllTubeBendersWithOverlay() as Product[];
  const lookup = buildLookup(all);
  const product =
    lookup.get(slugOf(params.slug)) ??
    (await findTubeBenderWithOverlay((b) => slugOf(b.id) === slugOf(params.slug) || slugOf(b.slug ?? "") === slugOf(params.slug)) as Product | undefined);

  if (!product) {
    return (
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-2">Not found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn't find that review.{" "}
          <Link className="underline" href="/reviews">Back to reviews</Link>
        </p>
      </main>
    );
  }

  const title = titleOf(product);
  const compareHref = `/compare?ids=${encodeURIComponent(product.id)}`;
  const img = imagePathForSlug(product.slug ?? product.id);


//Log for diagnostic, pasted by JRG
  console.log("SCORING INPUT KEYS:", Object.keys(product ?? {}));
  console.log("SCORING INPUT SAMPLE:", {
    id: (product as any)?.id,
    usaManufacturingTier: (product as any)?.usaManufacturingTier,
    originTransparencyTier: (product as any)?.originTransparencyTier,
    maxCapacity: (product as any)?.maxCapacity,
    maxBendAngle: (product as any)?.maxBendAngle,
    maxWall175Dom: (product as any)?.maxWall175Dom,
  });
 

  // Per-product score (total + breakdown) used both for the main score badge
  // and for the full "score math & citation log" breakdown below.
  const score = getProductScore(product);

  // Allow the score breakdown panel to auto-open when navigated via
  // .../reviews/[slug]?score=details (used by the "pt details" links).
  const scoreParam = searchParams?.score;
  const debugScore = searchParams?.debug === "1";
  const scoreDetailsOpen =
    typeof scoreParam === "string"
      ? scoreParam === "details"
      : Array.isArray(scoreParam)
      ? scoreParam.includes("details")
      : false;
  
  // Parse review content fields
  const splitLines = (raw?: string | null): string[] =>
    String(raw ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  const prosArray = splitLines((product as any).pros);
  const consArray = splitLines((product as any).cons);
  const consSourcesArray = splitLines((product as any).consSources);
  const keyFeaturesArray = splitLines((product as any).keyFeatures);

  // Auto Pros/Cons (facts + dataset rank). Merge enabled auto items with manual items.
  const auto = generateAutoProsCons(product as any, all as any[]);
  const enabledAutoPros = auto.filter((item) => item.type === "pro" && item.enabled).map((item) => item.text);
  const enabledAutoCons = auto.filter((item) => item.type === "con" && item.enabled).map((item) => item.text);

  // We still compute these for the UI decisions below, but the card itself always renders for uniformity.
  const hasAutoProsOrCons = enabledAutoPros.length > 0 || enabledAutoCons.length > 0;

  // Merge: manual items take precedence, then enabled auto items
  const finalPros = prosArray.length > 0 ? prosArray : enabledAutoPros;
  const finalCons = consArray.length > 0 ? consArray : enabledAutoCons;

  const hasProsOrCons = finalPros.length > 0 || finalCons.length > 0;

  const MATERIAL_KEYS = [
    "Mild steel",
    "Stainless steel",
    "4130 chromoly",
    "Aluminum",
    "Titanium",
    "Copper",
    "Brass",
  ];

  const materialsLabels = String((product as any).materials ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => MATERIAL_KEYS.includes(s));

  const highlightsArray = Array.isArray(product.highlights)
    ? product.highlights
    : String(product.highlights ?? "")
        .split(/[•\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

  // --- Pricing: compute min/max system totals from component fields ----------
  const parseMoney = (raw: unknown): number | null => {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    const parsed = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const frameMin = parseMoney((product as any).framePriceMin);
  const dieMin = parseMoney((product as any).diePriceMin);
  const hydraulicMin = parseMoney((product as any).hydraulicPriceMin);
  const standMin = parseMoney((product as any).standPriceMin);

  const frameMax = parseMoney((product as any).framePriceMax);
  const dieMax = parseMoney((product as any).diePriceMax);
  const hydraulicMax = parseMoney((product as any).hydraulicPriceMax);
  const standMax = parseMoney((product as any).standPriceMax);

  const hasMinComponents =
    frameMin !== null ||
    dieMin !== null ||
    hydraulicMin !== null ||
    standMin !== null;
  const hasMaxComponents =
    frameMax !== null ||
    dieMax !== null ||
    hydraulicMax !== null ||
    standMax !== null;

  const minSystemTotal =
    hasMinComponents
      ? (frameMin ?? 0) + (dieMin ?? 0) + (hydraulicMin ?? 0) + (standMin ?? 0)
      : parseMoney(product.price);

  const maxSystemTotal =
    hasMaxComponents
      ? (frameMax ?? 0) + (dieMax ?? 0) + (hydraulicMax ?? 0) + (standMax ?? 0)
      : null;

  const hasPricingSnapshot =
    minSystemTotal !== null || maxSystemTotal !== null;
  // ---------------------------------------------------------------------------

  const specs = SAFE_FIELDS
    .map((k) => {
      let value = product[k];

      // Special handling for Capacity:
      // - If admin has provided a maxCapacity value via the overlay,
      //   treat that as the authoritative "Capacity" shown in the specs
      //   card (this mirrors how the admin grid is currently being used).
      if (k === "capacity") {
        const maxCap = product.maxCapacity;
        if (maxCap !== undefined && maxCap !== null && String(maxCap).trim().length > 0) {
          value = maxCap;
        }
      }

      return [k, value] as const;
    })
    .filter(([, v]) => {
      if (v === undefined || v === null) return false;
      return String(v).trim().length > 0;
    });

  return (
    <main className="container mx-auto px-4 py-6">
      <JsonLd data={[reviewJsonLd(product, score?.total ?? null), breadcrumbJsonLd(product)]} />
      <h1 className="text-2xl font-semibold mb-3">{title}</h1>
      {/* Hero image - keep as-is */}
      <div className="rounded-lg overflow-hidden border mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={title} className="w-full h-64 object-cover" />
      </div>

      {/* Main content grid - responsive with mobile ordering */}
      <section className="mt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
          {/* LEFT: narrative content */}
          <div className="space-y-6 order-2 lg:order-1">
            {/* Existing highlights block */}
            {highlightsArray?.length ? (
              <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Highlights</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                  {highlightsArray.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Pros / Cons card */}
            <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs">
                        ✔
                      </span>
                      Pros
                    </h3>
                    {finalPros.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-gray-800 dark:text-gray-200">
                        {finalPros.map((line, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="mt-[3px] text-emerald-500">•</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        No pros listed. We explicitly only display pros when they are obvious from direct comparison within the range of models on this site and come from a clear, documented source (manufacturer documentation unless expressly stated otherwise inline with the pro).
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="flex items-center gap-1 text-sm font-semibold text-rose-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs">
                        !
                      </span>
                      Cons
                    </h3>
                    {finalCons.length > 0 ? (
                      <ul className="mt-2 space-y-2 text-sm text-gray-800 dark:text-gray-200">
                        {finalCons.map((line, idx) => {
                          // Sources only apply to admin-entered cons (not auto-generated).
                          const isAutoCon = consArray.length === 0 && idx < enabledAutoCons.length;
                          const source = isAutoCon ? "" : (consSourcesArray[idx] ?? "");
                          return (
                            <li key={idx}>
                              <div className="flex gap-2">
                                <span className="mt-[3px] text-rose-500">•</span>
                                <span>{line}</span>
                              </div>
                              {source && (
                                <div className="mt-0.5 pl-4 text-[0.7rem] text-gray-500 dark:text-gray-400">
                                  Source: {source}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        No cons listed. We explicitly only display cons when they are obvious from direct comparison within the range of models on this site and come from a clear, documented source (manufacturer documentation unless expressly stated otherwise inline with the con).
                      </p>
                    )}
                  </div>
                </div>
              </section>

            {/* Key features */}
            {keyFeaturesArray.length ? (
              <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Key features
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {keyFeaturesArray.map((feat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2.5 py-0.5 text-xs text-gray-800 dark:text-gray-200"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Materials compatibility */}
            {materialsLabels.length ? (
              <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Materials compatibility
                </h3>
                <p className="mt-1 text-[0.7rem] text-gray-500 dark:text-gray-400">
                  Based on manufacturer documentation and test use; not a substitute
                  for checking your exact material spec.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {materialsLabels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-0.5 text-xs text-gray-800 dark:text-gray-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* RIGHT: specs + score (shown first on mobile) */}
          <aside className="space-y-4 order-1 lg:order-2">
            <div className="rounded-lg border p-4">
              <h2 className="text-base font-medium mb-2">Specs &amp; score</h2>

              {score !== null && (
                <div className="mb-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-emerald-900">
                      Overall score
                    </span>
                    <span className="font-semibold text-emerald-900">
                      {score?.total ?? "—"} / {TOTAL_POINTS}
                    </span>
                  </div>
                </div>
              )}

              {hasPricingSnapshot && (
                <div className="mb-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-amber-900">
                      Pricing snapshot
                    </span>
                    <span className="text-right text-amber-900">
                      {minSystemTotal && (
                        <span className="block">
                          Min system:{" "}
                          <span className="font-semibold">
                            ${minSystemTotal.toFixed(0)}
                          </span>
                        </span>
                      )}
                      {maxSystemTotal && (
                        <span className="block">
                          Max system:{" "}
                          <span className="font-semibold">
                            ${maxSystemTotal.toFixed(0)}
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.7rem] text-amber-900/80">
                    Min system totals are built from the lowest documented prices for frame, dies, hydraulics, and stand/mount that we could verify.{" "}
                    <Link
                      href="/scoring#value-for-money"
                      className="underline"
                    >
                      See how we calculate pricing for scoring
                    </Link>
                    .
                  </p>
                </div>
              )}

              {Array.isArray(score?.breakdown) && score.breakdown.length > 0 && (
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  See the full breakdown below — every category, exactly how it&apos;s
                  scored, how this machine did, and the sources behind the data.
                </p>
              )}

              {specs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No specs available yet.</p>
              ) : (
                <dl className="text-sm">
                  {specs.map(([k, v]) => {
                    let valueStr = String(v);

                    // Show origin in plain shop language — no FTC jargon, no
                    // "assembled in USA" hedging, no editorializing about the maker.
                    let showOriginNote = false;
                    if (k === "usaClaim") {
                      const s = valueStr.toLowerCase();
                      if (
                        s.includes("no usa") ||
                        s.includes("imported") ||
                        s.startsWith("0")
                      ) {
                        valueStr = "Imported / no USA claim";
                      } else if (s.includes("usa") || s.includes("united states")) {
                        valueStr = "Made in USA";
                        showOriginNote = true;
                      }
                    }

                    return (
                      <div
                        key={String(k)}
                        className="flex flex-col gap-0.5 py-1 border-b last:border-b-0"
                      >
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            {labelFor(k)}
                          </dt>
                          <dd className="font-medium text-right">
                            {valueStr}
                          </dd>
                        </div>

                        {showOriginNote && (
                          <p className="text-[0.7rem] text-muted-foreground">
                            Manufacturer&rsquo;s own claim. We report it as published; we
                            don&rsquo;t independently verify country of origin.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>

            {/* "How scores are calculated" link replacing "Compare models" */}
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <Link
                href="/scoring"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                <span>How scores are calculated</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
      {/*
        The single consolidated per-model scoring view: for every category,
        the score + how it's scored + how this machine did + the sources — all
        in one place. Replaces the old duplicate breakdowns and separate
        citation panel.
      */}
      <div className="mx-auto mt-6 max-w-6xl px-6 pb-10">
        {product && <ScoringAndSources score={score} product={product as any} />}
      </div>

      {debugScore && score?.breakdown?.length ? (
        <section className="mt-8">
          <details className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <summary className="cursor-pointer select-none text-sm font-semibold text-gray-900 dark:text-gray-100">
              Debug scoring (no devtools)
            </summary>
            <div className="mt-3 space-y-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Add <code className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5">?debug=1</code> to toggle this panel.
              </div>
              <pre className="max-h-[520px] overflow-auto rounded bg-gray-50 dark:bg-gray-900 p-3 text-[12px] leading-snug text-gray-900 dark:text-gray-100">
{JSON.stringify(
  {
    total: score.total,
    source: score.source,
    breakdown: score.breakdown,
  },
  null,
  2,
)}
              </pre>
            </div>
          </details>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-6 mt-6 text-sm text-muted-foreground">
        <Link className="underline" href="/reviews">Back to all reviews</Link>
      </div>
    </main>
  );
}