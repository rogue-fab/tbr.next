'use client';
import * as React from 'react';
import { DiagnosticsTab } from './tabs/DiagnosticsTab';

/**
 * AdminTabs (minimal shell)
 * We keep the rescue-build safety posture (no DB writes) while exposing read-only diagnostics.
 */
export default function AdminTabs(): JSX.Element {
  const [tab, setTab] = React.useState<'status' | 'diagnostics'>('status');

  return (
    <section className="mx-auto max-w-5xl p-6 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin TABS TRIPWIRE 123</h1>
          <p className="mt-2 text-gray-600">
            Minimal admin shell for the rescue build. Read-only diagnostics are allowed; database writes remain disabled.
          </p>
        </div>
      </div>

      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setTab('status')}
            className={[
              'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium',
              tab === 'status'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            Status
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
        </nav>
      </div>

      <div className="mt-6">
        {tab === 'status' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Rescue Build Status</h2>
            <p className="mt-2 text-gray-600">
              The full admin panel is intentionally disabled in this rescue build. This area exists to unblock production
              builds while keeping the safety posture intact.
            </p>
            <ul className="mt-4 list-disc pl-6 text-gray-700">
              <li>No database writes.</li>
              <li>No credentials or environment variables required.</li>
              <li>Safe to deploy.</li>
            </ul>
          </div>
        )}

        {tab === 'diagnostics' && <DiagnosticsTab />}
      </div>
    </section>
  );
}

