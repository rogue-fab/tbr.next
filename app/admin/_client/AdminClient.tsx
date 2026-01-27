'use client';

import * as React from 'react';
import ProductsTab from '../../../components/admin/tabs/ProductsTab';
import { DiagnosticsTab } from '../../../components/admin/tabs/DiagnosticsTab';
import { BannerTab } from '../../../components/admin/tabs/BannerTab';

export default function AdminClient() {
  const [tab, setTab] = React.useState<'products' | 'diagnostics' | 'banner'>('products');

  return (
    <div className="px-4 py-6">
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setTab('products')}
            className={[
              'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium',
              tab === 'products'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setTab('diagnostics')}
            className={[
              'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium',
              tab === 'diagnostics'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setTab('banner')}
            className={[
              'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium',
              tab === 'banner'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            Banner
          </button>
        </nav>
      </div>

      {tab === 'products' && <ProductsTab />}
      {tab === 'diagnostics' && <DiagnosticsTab />}
      {tab === 'banner' && <BannerTab />}
    </div>
  );
}
