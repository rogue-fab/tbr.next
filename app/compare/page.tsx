import React from "react";
import Link from "next/link";
import { getAllTubeBendersWithOverlay } from "../../lib/catalogOverlay";
import ShareLink from "../../components/ShareLink";
import { redirect } from "next/navigation";
import { slugOf, parseIds, titleOf, slugForProduct } from "../../lib/ids";
import { getProductScore, TOTAL_POINTS } from "../../lib/scoring";
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
export default async function ComparePage({ searchParams }: ComparePageProps) {
  const products = (await getAllTubeBendersWithOverlay()) as Product[];
  const tokens = parseIds(searchParams?.ids); // raw query tokens

  let rows: Product[] = [];

  if (tokens.length === 0) {
    // No explicit ids: default to showing all products (overlay-aware).
    rows = products;
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

        // 3) Backwards-compat: numeric tokens as 1-based indexes into the product list
        //    e.g. ids=3,2,1 -> products[2], products[1], products[0]
        const n = Number(trimmed);
        if (Number.isInteger(n) && n > 0 && n <= products.length) {
          return products[n - 1];
        }

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
        <p className="text-sm text-muted-foreground">No matches.</p>
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
                const { total: score } = getProductScore(p as any);

                const parseMoney = (raw: unknown): number | null => {
                  if (raw === null || raw === undefined || raw === "") return null;
                  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
                  const parsed = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
                  return Number.isFinite(parsed) ? parsed : null;
                };

                const frameMin = parseMoney((p as any).framePriceMin);
                const dieMin = parseMoney((p as any).diePriceMin);
                const hydraulicMin = parseMoney((p as any).hydraulicPriceMin);
                const standMin = parseMoney((p as any).standPriceMin);

                const frameMax = parseMoney((p as any).framePriceMax);
                const dieMax = parseMoney((p as any).diePriceMax);
                const hydraulicMax = parseMoney((p as any).hydraulicPriceMax);
                const standMax = parseMoney((p as any).standPriceMax);

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
                    : parseMoney((p as any).price);

                const maxSystemTotal =
                  hasMaxComponents
                    ? (frameMax ?? 0) + (dieMax ?? 0) + (hydraulicMax ?? 0) + (standMax ?? 0)
                    : null;

                let priceLabel = "—";
                if (minSystemTotal && maxSystemTotal && maxSystemTotal > 0 && maxSystemTotal !== minSystemTotal) {
                  priceLabel = `$${minSystemTotal.toFixed(0)}–$${maxSystemTotal.toFixed(0)}`;
                } else if (minSystemTotal && minSystemTotal > 0) {
                  priceLabel = `$${minSystemTotal.toFixed(0)}+`;
                }

                const maxDiameter = p.maxCapacity ?? (p.max_od != null ? String(p.max_od) : "");

                let sBendLabel = "—";
                const rawSB = (p as any).sBendCapability;
                if (typeof rawSB === "boolean") {
                  sBendLabel = rawSB ? "Yes" : "No";
                } else if (typeof rawSB === "string" && rawSB.trim()) {
                  sBendLabel = rawSB.trim();
                }

                const mandrelLabel = p.mandrel && String(p.mandrel).trim().length > 0
                  ? String(p.mandrel)
                  : "—";

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
                      {maxDiameter || "—"}
                    </td>
                    <td className="p-2 border-b">
                      {mandrelLabel}
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