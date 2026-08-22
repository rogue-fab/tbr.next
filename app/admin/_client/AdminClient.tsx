'use client';

import * as React from 'react';
import ProductsTab from '../../../components/admin/tabs/ProductsTab';
import { DiagnosticsTab } from '../../../components/admin/tabs/DiagnosticsTab';
import { BannerTab } from '../../../components/admin/tabs/BannerTab';
import { AnalyticsTab } from '../../../components/admin/tabs/AnalyticsTab';

type AdminTab = 'products' | 'diagnostics' | 'analytics' | 'banner';

export default function AdminClient() {
  const [tab, setTab] = React.useState<AdminTab>('products');

  const tabBtn = (id: AdminTab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={[
        'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium',
        tab === id
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    <div className="px-4 py-6">
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabBtn('products', 'Products')}
          {tabBtn('diagnostics', 'Diagnostics')}
          {tabBtn('analytics', 'Analytics')}
          {tabBtn('banner', 'Banner')}
        </nav>
      </div>

      {tab === 'products' && <ProductsTab />}
      {tab === 'diagnostics' && <DiagnosticsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'banner' && <BannerTab />}
    </div>
  );
}
