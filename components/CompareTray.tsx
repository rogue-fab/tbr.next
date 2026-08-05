// components/CompareTray.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { readIds, writeIds, subscribe } from '../lib/compare';

export default function CompareTray() {
  const [ids, setIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Initial read
    setIds(readIds());

    // Listen for compare changes (your lib publishes)
    const unsub = subscribe(() => setIds(readIds()));

    // Also handle bfcache/visibility
    const resync = () => setIds(readIds());
    window.addEventListener('pageshow', resync);
    window.addEventListener('visibilitychange', resync);

    return () => {
      unsub();
      window.removeEventListener('pageshow', resync);
      window.removeEventListener('visibilitychange', resync);
    };
  }, []);

  if (ids.length === 0) return null;

  const clear = () => writeIds([]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {ids.length} {ids.length === 1 ? 'model' : 'models'} selected
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="rounded border px-3 py-1 text-sm"
          >
            Clear
          </button>
          <Link
            href={`/compare?ids=${encodeURIComponent(ids.join(','))}`}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
          >
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
