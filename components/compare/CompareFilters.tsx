'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function CompareFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleProductSelect = (productId: string) => {
    const newSelected = selectedProducts.includes(productId)
      ? selectedProducts.filter(id => id !== productId)
      : [...selectedProducts, productId];
    
    setSelectedProducts(newSelected);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (newSelected.length > 0) {
      params.set('compare', newSelected.join(','));
    } else {
      params.delete('compare');
    }
    router.replace(`/compare?${params.toString()}`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Products to Compare</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Product selection checkboxes would go here */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={selectedProducts.includes('baileigh-rdb-250')}
              onChange={() => handleProductSelect('baileigh-rdb-250')}
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Baileigh RDB-250</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Hydraulic Tube Bender</div>
            </div>
          </label>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={selectedProducts.includes('jd2-model-32')}
              onChange={() => handleProductSelect('jd2-model-32')}
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">JD2 Model 32</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Hydraulic Tube Bender</div>
            </div>
          </label>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={selectedProducts.includes('pro-tools-105')}
              onChange={() => handleProductSelect('pro-tools-105')}
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Pro-Tools 105</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Manual Tube Bender</div>
            </div>
          </label>
        </div>
      </div>

      {selectedProducts.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={() => {
              setSelectedProducts([]);
              router.replace('/compare');
            }}
            className="text-sm text-red-600 hover:text-red-500"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}

