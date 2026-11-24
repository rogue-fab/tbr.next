import Link from "next/link";

export const metadata = {
  title: "Scoring Changelog | TubeBenderReviews",
  description:
    "Every change to the TubeBenderReviews scoring rules, when it happened, why, and what it did to the scores — including RogueFab's.",
};

type Change = {
  date: string;
  title: string;
  what: string[];
  why: string;
  effect?: string;
};

// Newest first. Every rule change gets an entry here BEFORE it ships, with its
// effect on scores stated plainly — including the effect on RogueFab.
const CHANGES: Change[] = [
  {
    date: "November 2026",
    title: "Diameter weighted up, Value weighted down, partial S-bend credit, “if documented” scores",
    what: [
      "Max Diameter Capability: 10 → 14 points. New tiers: ≥2.5\" = 14 · ≥2.375\" = 12 · ≥2.25\" = 11 · ≥2.0\" = 9 · ≥1.75\" = 6 · ≥1.5\" = 4 · smaller = 2.",
      "Value for Money: 20 → 16 points. The per-$1,000 thresholds are unchanged; only the points at each step were scaled down.",
      "S-Bend: a new 2-point tier for machines whose maker documents S-bends and publishes the minimum straight between them, when that straight is longer than our 0.125\" true S-bend limit. The published number is shown on the homepage.",
      "Every model now shows the score it would earn if its maker published every documentation-only item (manual, instructions, springback guidance, official video, component origins). The hardware doesn't change in that figure.",
    ],
    why:
      "Diameter decides which jobs a bender can take at all, so it was underweighted. Value already re-counts every capability point (it is capability ÷ price), so at 20 points it double-rewarded cheap capability. The old all-or-nothing S-bend rule gave nothing to machines that do S-bends with a longer straight, even when the maker publishes the number.",
    effect:
      "RogueFab models (max 2.0\" OD) lost 2–3 points. Machines rated for 2.5\" gained up to 4. No ranking changed. All scores are recomputed from the same published data, and every review shows the new math.",
  },
  {
    date: "November 2026",
    title: "Wall thickness carry-down rule; materials scored independently",
    what: [
      "If a maker publishes its max wall only at a larger tube than 1.75\", that same wall is credited at 1.75\". It is never scaled up, and a figure from a smaller tube is never carried up.",
      "Materials (0–4) no longer depend on having a wall-thickness figure.",
    ],
    why:
      "Bending force grows roughly with diameter squared times wall, so a machine rated for a wall on a bigger tube can bend that wall on a smaller one. Scoring 0 for a rating published at 2.5\" was unfair; scaling the number up would be a guess.",
    effect: "Raised several Baileigh and JMR scores. No RogueFab score changed.",
  },
  {
    date: "November 2026",
    title: "USA claim downgrade rule",
    what: [
      "A “Made in USA” claim scores 1 instead of 2 when the maker's own pages disclose an imported major component sold for that machine. The review names the exact page and explains why.",
    ],
    why: "A flat claim and a disclosed import on the maker's own site can't both be taken at face value.",
  },
  {
    date: "August 2026",
    title: "Origin scoring split; springback replaces angle stop; stand rule",
    what: [
      "USA Manufacturing Claim (0–2, the maker's words) was separated from Origin Disclosure (0–8, country-neutral: documenting where parts come from earns points, USA or imported).",
      "Published springback/overbend guidance replaced the angle-stop item in Ease of Use.",
      "A machine that needs a stand the maker doesn't sell gets a nominal $200 added to its system price, and scores 0 on Single-Source.",
    ],
    why:
      "Origin points should reward transparency, not a country. Springback guidance helps a buyer more than an angle stop does. Pricing a required, missing part at $0 rewards an incomplete offering.",
  },
];

export default function ScoringChangelogPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <nav className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        <Link href="/scoring" className="hover:underline">
          Scoring methodology
        </Link>{" "}
        / Changelog
      </nav>
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Scoring changelog</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        This site is published by the founder of RogueFab, which makes some of the benders we score. Because of that, every rule
        change is listed here with the date, the reason, and what it did to the scores, including RogueFab&apos;s. Rules are set on
        principle first; we report the result either way. The full current rules are on the{" "}
        <Link href="/scoring" className="underline">
          methodology page
        </Link>
        .
      </p>

      <ol className="mt-8 space-y-6">
        {CHANGES.map((c) => (
          <li
            key={c.date + c.title}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{c.date}</div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{c.title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200">
              {c.what.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
              <span className="font-semibold">Why: </span>
              {c.why}
            </p>
            {c.effect && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="font-semibold">Effect on scores: </span>
                {c.effect}
              </p>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
