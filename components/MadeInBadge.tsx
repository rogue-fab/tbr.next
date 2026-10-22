// components/MadeInBadge.tsx
//
// Compact origin badge for the compare/list views: the maker's claim
// ("Made in USA" or "USA claim"), tiny muted qualifier beneath. Both USA buckets
// share one style; the wording carries the difference. Presentation only (see
// lib/originDisplay).

import { classifyOrigin } from "../lib/originDisplay";

export default function MadeInBadge({ country }: { country?: string | null }) {
  const { primary, qualifier, usa } = classifyOrigin(country);

  return (
    <div className="leading-tight">
      <div
        className={
          usa
            ? "text-sm font-semibold text-gray-900 dark:text-gray-100"
            : "text-sm text-gray-500 dark:text-gray-400"
        }
      >
        {primary}
      </div>
      {qualifier ? (
        <div className="text-[0.6rem] uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {qualifier}
        </div>
      ) : null}
    </div>
  );
}
