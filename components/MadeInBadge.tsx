// components/MadeInBadge.tsx
//
// Compact origin badge for the compare/list views: prominent "Made in USA",
// tiny muted FTC qualifier beneath. Both USA buckets render identically in
// style so a genuinely USA-built machine never reads as weaker than a
// competitor's blanket "Made in USA". Presentation only (see lib/originDisplay).

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
