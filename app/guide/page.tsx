import { SmartTubeBenderFinder, type FinderModel } from "../../components/guide/SmartTubeBenderFinder";
import BuyersGuide from "../../components/guide/BuyersGuide";
import { getAllTubeBendersWithOverlay } from "../../lib/catalogOverlay";
import { selectPublicModels } from "../../lib/completeness";
import { getProductScore } from "../../lib/scoring";
import { computeSystemPrice } from "../../lib/systemPrice";
import { titleOf, slugForProduct } from "../../lib/ids";

// Live data (same public set and scores as the homepage and reviews).
export const dynamic = "force-dynamic";

function toOd(raw: unknown): number | null {
  const n = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** /guide — the finder (real published models) plus the written buyer's guide. */
export default async function GuidePage() {
  const all = await getAllTubeBendersWithOverlay();
  const { visible } = selectPublicModels(all);
  const models: FinderModel[] = visible.map((p: any) => {
    const { min, max } = computeSystemPrice(p);
    return {
      id: p.id,
      slug: slugForProduct(p),
      name: titleOf(p),
      score: getProductScore(p).total,
      priceMin: min ?? null,
      priceMax: max ?? null,
      maxOd: toOd(p.maxCapacity),
      powerType: p.powerType ?? null,
      materials: toList(p.materials),
      image: p.image ?? null,
    };
  });

  return (
    <div>
      <SmartTubeBenderFinder models={models} />
      <BuyersGuide />
    </div>
  );
}
