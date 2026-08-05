'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TubeBender, MandrelTier } from '../../lib/validators';

const MANDREL_OPTIONS: Array<{ value: MandrelTier; label: string }> = [
  { value: "bronze", label: "Bronze" },
  { value: "economy", label: "Economy" },
  { value: "none", label: "None" },
];

interface FilterBarProps {
  className?: string;
}

export function FilterBar({ className = '' }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [textFilter, setTextFilter] = useState(searchParams.get('search') || '');
  const [mandrelFilter, setMandrelFilter] = useState<MandrelTier | "all">(
    ((searchParams.get("mandrel") as MandrelTier | "all") || "all")
  );

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (textFilter) {
        params.set('search', textFilter);
      } else {
        params.delete('search');
      }
      router.replace(`?${params.toString()}`);
    }, 200);

    return () => clearTimeout(timer);
  }, [textFilter, router, searchParams]);

  const handleMandrelChange = useCallback((mandrel: MandrelTier | "all") => {
    setMandrelFilter(mandrel);
    const params = new URLSearchParams(searchParams);
    if (mandrel === 'all') {
      params.delete('mandrel');
    } else {
      params.set('mandrel', mandrel);
    }
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

    return (
    <div className={`bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Text Search */}
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="Search by brand or model..."
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-describedby="search-description"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <p id="search-description" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Filter by brand name or model number
          </p>
        </div>

        {/* Mandrel Filter */}
        <div className="sm:w-48">
          <label htmlFor="mandrel-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mandrel
          </label>
          <select
            id="mandrel-filter"
            value={mandrelFilter}
            onChange={(e) => handleMandrelChange(e.target.value as MandrelTier | "all")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Options</option>
            {MANDREL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chip Filters */}
      <div className="mt-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Quick Filters:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {MANDREL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                handleMandrelChange(mandrelFilter === opt.value ? "all" : opt.value)
              }
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                mandrelFilter === opt.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              aria-pressed={mandrelFilter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
