// Server component: deploy-safe landing page
import Link from "next/link";
import { Tag, ShieldCheck, TrendingUp } from "lucide-react";
import { getAllTubeBendersWithOverlay } from "../lib/catalogOverlay";
import { getProductScore } from "../lib/scoring";
import { titleOf, slugForProduct } from "../lib/ids";
import LandingCompareSection, { type LandingCompareRow } from "../components/LandingCompareSection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "TBR | TubeBenderReviews",
  description:
    "Compare popular tube benders side-by-side and find the best choice for your shop.",
};

export default async function Page() {
  // Prepare data for landing compare section
  const products = await getAllTubeBendersWithOverlay();
  const parseMoney = (raw: unknown): number | null => {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    const parsed = parseFloat(String(raw).replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const compareRows: LandingCompareRow[] = products.map((p) => {
    const { total: score } = getProductScore(p as any);

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

    const priceMin =
      hasMinComponents
        ? (frameMin ?? 0) + (dieMin ?? 0) + (hydraulicMin ?? 0) + (standMin ?? 0)
        : parseMoney((p as any).price);

    const priceMax =
      hasMaxComponents
        ? (frameMax ?? 0) + (dieMax ?? 0) + (hydraulicMax ?? 0) + (standMax ?? 0)
        : null;

    // Normalize S-bend capability: accept both boolean and "Yes"/"No" from admin
    let sBend: boolean | null = null;
    const rawSB = (p as any).sBendCapability;
    if (typeof rawSB === "boolean") {
      sBend = rawSB;
    } else if (typeof rawSB === "string") {
      const s = rawSB.trim().toLowerCase();
      if (s === "yes") sBend = true;
      else if (s === "no") sBend = false;
    }

    return {
      id: p.id,
      slug: slugForProduct(p),
      name: titleOf(p),
      brand: p.brand,
      model: p.model,
      score,
      priceMin,
      priceMax,
      maxCapacity:
        (p as any).maxCapacity ??
        ((p as any).max_od != null ? String((p as any).max_od) : null),
      powerType: (p as any).powerType ?? null,
      country: (p as any).country ?? null,
      mandrel: (p as any).mandrel ?? null,
      sBend,
      image: (p as any).image ?? null,
    };
  });

  return (
    <main className="bg-white">
      {/* HERO BLOCK (image + overlay + content) */}
      <section className="relative overflow-hidden">
        {/* Hero Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url(/images/hero/hero-industrial.jpg)",
          }}
        />

        {/* Dark overlay to keep text readable */}
        <div className="absolute inset-0 bg-black/65" />

        {/* Foreground content */}
        <div className="relative">
          {/* Hero section */}
          <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center text-white min-h-[36rem] md:min-h-[42rem]">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Find the Right Tube Bender in Minutes.
          </h1>
          <p className="mt-8 text-sm sm:text-base text-white/80 max-w-2xl mx-auto">
            Compare real-world capacity, die and tooling costs, footprint, and workflow speed across
            popular shop benders — all in one place.
          </p>

          {/* Proof tiles */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left text-xs sm:text-sm">
            <div className="rounded-lg bg-black/55 border-2 border-white/40 px-4 py-3 shadow-md">
              <div className="font-semibold text-white">
                11-Point Scoring Algorithm
              </div>
              <div className="mt-1 text-white/70">
                Weighted for real shop priorities like capacity, tooling cost, and uptime.
              </div>
            </div>
            <div className="rounded-lg bg-black/55 border-2 border-white/40 px-4 py-3 shadow-md">
              <div className="font-semibold text-white">
                12+ Brands Reviewed
              </div>
              <div className="mt-1 text-white/70">
                Popular fabrication benders compared on a common scoring framework.
              </div>
            </div>
            <div className="rounded-lg bg-black/55 border-2 border-white/40 px-4 py-3 shadow-md">
              <div className="font-semibold text-white">
                100% Transparent Methodology
              </div>
              <div className="mt-1 text-white/70">
                Clear criteria and scoring so you can sanity-check every recommendation.
              </div>
            </div>
          </div>

            {/* Trust line (above buttons) */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs sm:text-sm text-white/80">
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              <span>Expert Tested</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-orange-400" />
              <span>Unbiased Reviews</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4 text-orange-400" />
              <span>Value-Focused</span>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/compare"
              className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-colors"
              aria-label="Start comparing tube benders"
            >
              Start Comparing
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors"
              aria-label="Open buyer's guide"
            >
              Buyer&apos;s Guide
            </Link>
          </div>

          {/* Mobile attribution in-flow */}
          <p className="mt-10 text-xs text-white/70 sm:hidden">
            Built by Mechanical Engineer Joseph Gambino — data-driven, brand-agnostic comparisons.
          </p>

          {/* Desktop attribution pinned to bottom-right of hero */}
          <div className="hidden sm:block absolute bottom-4 right-6 text-[11px] text-white/75 text-right max-w-xs leading-snug">
            Built by Mechanical Engineer Joseph Gambino
            <br />
            — data-driven, brand-agnostic comparisons.
          </div>
          </section>
        </div>
      </section>

      {/* Landing Compare Section */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <LandingCompareSection rows={compareRows} />
      </section>
    </main>
  );
}
