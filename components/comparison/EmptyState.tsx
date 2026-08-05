'use client';

import { useRouter } from 'next/navigation';

export function EmptyState() {
  const router = useRouter();

  const handleReset = () => {
    router.replace('/');
  };

  return (
    <div className="text-center py-12">
      <div className="text-gray-500 dark:text-gray-400">
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No products match your filters.</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
          Try adjusting your search or filter criteria.
        </p>
        <button
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
