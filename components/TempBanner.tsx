// components/TempBanner.tsx
//
// Site-wide "TEMP DATA" banner. Now controlled from the admin Banner tab
// (runtime setting in app_settings) instead of a build-time env var.
//
// Visibility rule (unchanged operation):
//   show = adminEnabled OR (activeModelCount < ACTIVE_THRESHOLD)
//
// - adminEnabled is the toggle in the Banner tab.
// - Even when the owner turns it OFF, the banner stays up until at least
//   ACTIVE_THRESHOLD models are complete, then auto-hides.
//
// Async server component so it can read the live setting + active-model count.
// Fails safe: if anything can't be determined, the banner shows.

import { getAllTubeBendersWithOverlay } from "../lib/catalogOverlay";
import { selectPublicModels } from "../lib/completeness";
import { getTempBannerSetting, DEFAULT_TEMP_BANNER_MESSAGE } from "../lib/appSettings";

export default async function TempBanner() {
  let enabled = true;
  let message = DEFAULT_TEMP_BANNER_MESSAGE;
  try {
    const setting = await getTempBannerSetting();
    enabled = setting.enabled;
    message = setting.message;
  } catch {
    // Fail safe: keep the banner up if the setting can't be read.
    enabled = true;
  }

  let thresholdMet = false;
  try {
    const products = await getAllTubeBendersWithOverlay();
    thresholdMet = selectPublicModels(products).thresholdMet;
  } catch {
    thresholdMet = false;
  }

  const show = enabled || !thresholdMet;
  if (!show) return null;

  return (
    <div
      role="alert"
      className="w-full bg-red-600 text-white text-center text-sm sm:text-base font-semibold py-2 px-3"
    >
      {message}
    </div>
  );
}
