import Link from "next/link";

import { getAllTubeBendersWithOverlay } from "../../lib/catalogOverlay";
import { getProductScore, TOTAL_POINTS } from "../../lib/scoring";
import { slugForProduct, titleOf } from "../../lib/ids";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tube Bender Reviews | TubeBenderReviews",
  description:
    "Browse all tube bender reviews, see scores, and open full breakdowns.",
};

// Map internal FTC origin buckets to consumer-facing labels.
// Same mapping as the landing compare table, but kept local here
// to avoid coupling UI components.
function displayOriginLabel(country?: string): string {
  const raw = (country ?? "").trim();
  if (!raw) return "Origin not specified";

  const lower = raw.toLowerCase();

  if (lower.includes("ftc-unqualified") && lower.includes("made in usa")) {
    return "Made in USA (full-origin claim)";
  }

  if (
    lower.includes("assembled in usa") ||
    lower.includes("qualified usa claim")
  ) {
    return "USA-assembled / Mixed origin";
  }

  return "Imported / International origin";
}

export default async function ReviewsIndexPage() {
  const products = await getAllTubeBendersWithOverlay();

  const rows = products
    .map((p) => {
      const { total: score } = getProductScore(p as any);
      const slug = slugForProduct(p as any);
      const title = titleOf(p as any);

      return {
        id: p.id as string,
        slug,
        title,
        brand: (p as any).brand as string | undefined,
        model: (p as any).model as string | undefined,
        powerType: (p as any).powerType as string | undefined,
        country: (p as any).country as string | undefined,
        score,
      };
    })
    .sort((a, b) => {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      if (sa === sb) return a.title.localeCompare(b.title);
      return sb - sa;
    });

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-2 text-2xl font-semibold">Tube Bender Reviews</h1>
      <p className="mb-4 text-sm text-gray-600">
        Every model listed here has a full objective score and pricing snapshot.
        Open any review to see the full scoring breakdown, pros and cons, and
        materials compatibility.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Score</th>
              <th className="px-3 py-2 text-left">Power</th>
              <th className="px-3 py-2 text-left">Made in</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-gray-500"
                >
                  No reviews available yet. Check back soon.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="bg-white">
                <td className="px-3 py-3 align-middle">
                  <div className="flex flex-col">
                    <Link
                      href={`/reviews/${row.slug}`}
                      className="text-sm font-semibold text-gray-900 hover:underline"
                    >
                      {row.title}
                    </Link>
                    {(row.brand || row.model) && (
                      <div className="text-xs text-gray-500">
                        {[row.brand, row.model].filter(Boolean).join(" ")}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 align-middle">
                  {row.score != null ? (
                    <span className="text-sm font-semibold text-gray-900">
                      {row.score}{" "}
                      <span className="text-xs text-gray-500">
                        / {TOTAL_POINTS}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Not scored</span>
                  )}
                </td>
                <td className="px-3 py-3 align-middle text-sm text-gray-800">
                  {row.powerType || "—"}
                </td>
                <td className="px-3 py-3 align-middle text-sm text-gray-800">
                  {displayOriginLabel(row.country)}
                </td>
                <td className="px-3 py-3 align-middle">
                  <Link
                    href={`/reviews/${row.slug}`}
                    className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
                  >
                    View review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        Looking for side-by-side comparison instead?{" "}
        <Link href="/compare" className="underline">
          Go to the comparison table
        </Link>
        .
      </div>
    </main>
  );
}
