"use client";
import React from "react";
import Link from "next/link";
import { SmartTubeBenderFinder } from "../../components/guide/SmartTubeBenderFinder";
import { readIds } from "../../lib/compare";
import { allTubeBenders } from "../../lib/catalog";
import { slugOf } from "../../lib/ids";

type Product = { id: string; brand?: string; model?: string; name?: string };

/** Convert selection tokens (likely numeric indices) to canonical product IDs safely. */
function selectionToCanonicalIds(selection: Array<string | number>, list: Product[]): string[] {
  const ids: string[] = [];
  for (const t of selection ?? []) {
    // allow both numbers and numeric strings
    const n = typeof t === "number" ? t : /^[0-9]+$/.test(String(t)) ? parseInt(String(t), 10) : NaN;
    if (!Number.isNaN(n) && n >= 0 && n < list.length) {
      ids.push(list[n].id);
      continue;
    }
    // if not a clean index, accept known IDs or slugs directly
    const s = String(t).trim();
    if (s && list.some(p => p.id === s || p.id === slugOf(s))) {
      // normalize to id if slug matches
      const p = list.find(p => p.id === s || p.id === slugOf(s))!;
      ids.push(p.id);
    }
  }
  // de-dupe, preserve order
  return Array.from(new Set(ids));
}

/** GuidePage – renders the route-specific tile grid (with filters) */
export default function GuidePage() {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Read initial compare IDs and subscribe to changes
    setSelectedIds(readIds());
    const handleStorageChange = () => setSelectedIds(readIds());
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("compare:changed", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("compare:changed", handleStorageChange);
    };
  }, []);

  // Convert selected IDs to canonical IDs for compare URL
  const products = allTubeBenders as Product[];
  const canonicalIds = selectionToCanonicalIds(selectedIds, products);
  const compareHref = canonicalIds.length > 0 
    ? `/compare?ids=${canonicalIds.join(",")}` 
    : "/compare";

  return (
    <div>
      <SmartTubeBenderFinder />
      
      {/* Compare CTA - only show when items are selected */}
      {canonicalIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <Link
            href={compareHref}
            className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Compare {canonicalIds.length} item{canonicalIds.length === 1 ? "" : "s"}
          </Link>
        </div>
      )}
    </div>
  );
}
