// components/TempBanner.tsx
//
// Site-wide "TEMP DATA" banner with data-driven auto-retirement.
//
// Visibility rule:
//   show = adminWantsOn OR (activeModelCount < ACTIVE_THRESHOLD)
//
// - NEXT_PUBLIC_SHOW_TEMP_BANNER === "1" means the admin wants the banner ON;
//   it always shows in that case.
// - When the admin turns it OFF (flag not "1"), the banner still stays up until
//   at least ACTIVE_THRESHOLD models are fully complete, then auto-hides.
//
// This is an async server component so it can read the live active-model count.
// It fails safe: if the count can't be determined, the banner shows.

import { getAllTubeBendersWithOverlay } from "../lib/catalogOverlay";
import { selectPublicModels } from "../lib/completeness";

export default async function TempBanner() {
  const adminWantsOn =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SHOW_TEMP_BANNER === "1";

  let thresholdMet = false;
  try {
    const products = await getAllTubeBendersWithOverlay();
    thresholdMet = selectPublicModels(products).thresholdMet;
  } catch {
    // Fail safe: if we can't determine completeness, keep the banner up.
    thresholdMet = false;
  }

  const show = adminWantsOn || !thresholdMet;
  if (!show) return null;

  return (
    <div
      role="alert"
      className="w-full bg-red-600 text-white text-center text-sm sm:text-base font-semibold py-2 px-3"
    >
      TEMP DATA — COME BACK LATER. This site is in placeholder mode; specs/compare may be inaccurate.
    </div>
  );
}
