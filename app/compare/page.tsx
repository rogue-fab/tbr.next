import React from "react";
import Link from "next/link";
import { getAllTubeBendersWithOverlay } from "../../lib/catalogOverlay";
import { selectPublicModels } from "../../lib/completeness";
import ShareLink from "../../components/ShareLink";
import { redirect } from "next/navigation";
import { slugOf, parseIds, titleOf, slugForProduct } from "../../lib/ids";
import { getProductScore, TOTAL_POINTS } from "../../lib/scoring";
import { computeSystemPrice } from "../../lib/systemPrice";
// NOTE: Only accepts canonical product identifiers (id/slug/name/brand+model)

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Product = {
  id: string;
  slug?: string;
  name?: string;
  brand?: string;
  model?: string;
  // Core specs / scoring-related fields
  price?: string | number;
  maxCapacity?: string;
  max_od?: string | number;
  powerType?: string;
  mandrel?: string;
  sBendCapability?: string | boolean;
  // Pricing breakdown fields (overlay-driven)
  framePriceMin?: string | number;
  framePriceMax?: string | number;
  diePriceMin?: string | number;
  diePriceMax?: string | number;
  hydraulicPriceMin?: string | number;
  hydraulicPriceMax?: string | number;
  standPriceMin?: string | number;
  standPriceMax?: string | number;
};


function buildLookup(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const p of products) {
    const keys = new Set<string>();
    // Always index by ID as well (normalized for safety)
    if (p.id) keys.add(p.id);
    if (p.slug) keys.add(p.slug);
    if (p.name) keys.add(p.name);
    const bm = [p.brand, p.model].filter(Boolean).join(" ");
    if (bm) keys.add(bm);
    for (const c of Array.from(keys)) map.set(slugOf(c), p);
  }
  return map;
}

function dedupePreserveOrder(items: Product[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of items) {
    const key = p.id || p.slug;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

type ComparePageProps = { searchParams?: { ids?: string | string[] } };
function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function formatOd(raw: unknown): string {
  const n = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `${Number(n.toFixed(3))}"` : "—";
}

function mandrelLabel(raw: unknown): string {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "bronze" || s === "available" || s.includes("nickel")) return "Bronze";
  if (s === "economy") return "Economy";
  return "None";
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  // Only PUBLIC (complete + verified) models can be compared. Unfinished models
  // must not leak out through ?ids= with a partial, unverified score.
  const products = selectPublicModels((await getAllTubeBendersWithOverlay()) as Product[]).visible as Product[];
  const tokens = parseIds(searchParams?.ids); // raw query tokens

  let rows: Product[] = [];

  if (tokens.length === 0) {
    // No explicit ids: default to the public set (finished models once enough
    // exist; most-complete fallback before then). Explicit ?ids= comparisons
    // below still resolve ANY requested model, active or not.
    rows = products.slice().sort((a, b) => (getProductScore(b as any).total ?? -1) - (getProductScore(a as any).total ?? -1));
  } else {
    // Build a lookup map from the overlay-aware product list.
    const byId = new Map(products.map((p) => [p.id, p])); // fast direct ID match
    const lookup = buildLookup(products); // slug/name/brand+model

    // Resolve by trying raw ID first, then normalized key
    const matched = tokens
      .map((raw) => {
        const trimmed = raw.trim();
        // 1) Direct ID match (preferred)
        const direct = byId.get(trimmed);
        if (direct) return direct;

        // 2) Slug/name/brand+model lookup
        const key = slugOf(trimmed);
        const fromLookup = lookup.get(key);
        if (fromLookup) return fromLookup;

        return undefined;
      })
      .filter(Boolean) as Product[];

    rows = dedupePreserveOrder(matched);
  }

  // --- Canonicalize URL (strict) ---------------------------------------------
  // Redirect if raw tokens != resolved canonical IDs (length/order/value differ).
  // Only do this when ids were actually supplied; /compare with no ids should
  // just show the full table without redirect noise.
  if (tokens.length > 0 && rows.length > 0) {
    const canonicalIds = rows.map((p) => p.id);
    const needsRedirect =
      tokens.length !== canonicalIds.length ||
      tokens.some((t, i) => t !== canonicalIds[i]);
    if (needsRedirect) {
      const qp = new URLSearchParams();
      qp.set("ids", canonicalIds.join(","));
      redirect(`/compare?${qp.toString()}`);
    }
  }
  // ---------------------------------------------------------------------------

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Compare</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None of those models are published yet.{" "}
          <Link className="underline" href="/compare">
            Compare all published models
          </Link>
          .
        </p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm border">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left p-2 border-b">Name</th>
                <th className="text-left p-2 border-b">Score</th>
                <th className="text-left p-2 border-b">Price range (min–max)</th>
                <th className="text-left p-2 border-b">Power</th>
                <th className="text-left p-2 border-b">Max diameter</th>
                <th className="text-left p-2 border-b">Mandrel</th>
                <th className="text-left p-2 border-b">S-bend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const scored = getProductScore(p as any);
                const score = scored.total;

                const { min: minSystemTotal, max: maxSystemTotal } = computeSystemPrice(p as any);

                let priceLabel = "—";
                if (minSystemTotal && maxSystemTotal && maxSystemTotal > 0 && Math.round(maxSystemTotal) !== Math.round(minSystemTotal)) {
                  priceLabel = `${money(minSystemTotal)} – ${money(maxSystemTotal)}`;
                } else if (minSystemTotal && minSystemTotal > 0) {
                  priceLabel = money(minSystemTotal);
                }

                const maxDiameter = formatOd(p.maxCapacity ?? p.max_od);

                // S-bend label comes from the score itself so the table can't disagree with the points.
                const sbPts = scored.breakdown?.find((b) => b.criteria === "S-Bend Capability")?.points ?? 0;
                const sBendLabel = sbPts >= 3 ? "True S-bend (3/3)" : sbPts >= 2 ? "Partial (2/3)" : "Not documented (0/3)";

                return (
                  <tr key={p.id} className="odd:bg-background even:bg-muted/10">
                    <td className="p-2 border-b font-medium">
                      <Link
                        href={`/reviews/${slugForProduct(p)}`}
                        className="underline hover:no-underline"
                      >
                        {titleOf(p)}
                      </Link>
                    </td>
                    <td className="p-2 border-b">
                      {score != null ? `${score} / ${TOTAL_POINTS}` : "—"}
                    </td>
                    <td className="p-2 border-b">
                      {priceLabel}
                    </td>
                    <td className="p-2 border-b">
                      {p.powerType ?? "—"}
                    </td>
                    <td className="p-2 border-b">
                      {maxDiameter}
                    </td>
                    <td className="p-2 border-b">
                      {mandrelLabel(p.mandrel)}
                    </td>
                    <td className="p-2 border-b">
                      {sBendLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <ShareLink relativeHref={`/compare?ids=${rows.map((p) => p.id).join(",")}`} />
      )}
      <div className="mt-4 text-sm text-muted-foreground">
        <Link className="underline" href="/reviews">Browse reviews</Link>
      </div>
    </main>
  );
}