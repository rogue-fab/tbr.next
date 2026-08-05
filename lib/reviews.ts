/**
 * Return a de-duplicated list of known review slugs by scanning tolerant data sources.
 * This is used by /reviews/[slug] to pre-render static paths on build.
 */
export async function getKnownReviewSlugs(): Promise<string[]> {
  const loaders: Array<() => Promise<any>> = [
    () => import("./catalog"),
  ];

  const seen = new Set<string>();

  for (const load of loaders) {
    try {
      const mod = await load();
      const rows =
        // common shapes we've seen: default export array or named `rows`
        (Array.isArray((mod as any)?.default) && (mod as any).default) ||
        (Array.isArray((mod as any)?.rows) && (mod as any).rows) ||
        (Array.isArray(mod) && (mod as any)) ||
        null;
      if (!rows) continue;
      for (const r of rows as any[]) {
        const slugish = (r?.slug ?? r?.id ?? "").toString().trim();
        if (slugish) seen.add(slugish);
      }
    } catch {
      // ignore missing modules/shapes; keep scanning others
    }
  }

  return Array.from(seen);
}

/**
 * Convenience: produce static params objects for Next.js app router.
 */
export async function getStaticReviewParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getKnownReviewSlugs();
  return slugs.map((slug) => ({ slug }));
}

export type Review = {
  id: string
  title: string
  subtitle?: string
  body: string
}

const seed: Review[] = [
  {
    id: "rdb-250",
    title: "Baileigh RDB-250",
    subtitle: "Hydraulic • Taiwan • Max 1-1/2\" OD",
    body: "Full review coming soon. Overview, pros/cons, and buying advice will appear here."
  },
  {
    id: "jd2-32",
    title: "JD2 Model 32",
    subtitle: "Manual • USA • Max 2\" OD",
    body: "Full review coming soon. Overview, pros/cons, and buying advice will appear here."
  },
  {
    id: "m600",
    title: "RogueFab M600 Series",
    subtitle: "Hydraulic • USA • Max 2-3/8\" OD",
    body: "Full review coming soon. Overview, pros/cons, and buying advice will appear here."
  }
]

export async function getReviewById(id: string) {
  const needle = String(id).toLowerCase()
  const hit =
    seed.find(r => r.id.toLowerCase() === needle)
    ?? seed.find(r => r.title.toLowerCase().includes(needle))
  return hit ?? null
}
