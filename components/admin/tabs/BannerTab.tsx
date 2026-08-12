'use client';

import { useEffect, useState } from 'react';

type BannerSetting = { enabled: boolean; message: string };
type BannerStatus = {
  activeCount: number;
  totalCount: number;
  threshold: number;
  thresholdMet: boolean;
  visible: boolean;
};

export function BannerTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const [defaultMessage, setDefaultMessage] = useState('');
  const [status, setStatus] = useState<BannerStatus | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch('/api/admin/banner', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.error || `Failed to load banner settings (${res.status}).`);
        setHint(json?.hint || null);
        return;
      }
      const s: BannerSetting = json.setting;
      setEnabled(s.enabled);
      setMessage(s.message);
      setDefaultMessage(json.defaultMessage || '');
      setStatus(json.status);
      setDirty(false);
    } catch (e) {
      setError('Failed to load banner settings (network error).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch('/api/admin/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.error || `Failed to save (${res.status}).`);
        setHint(json?.hint || null);
        return;
      }
      const s: BannerSetting = json.setting;
      setEnabled(s.enabled);
      setMessage(s.message);
      setStatus(json.status);
      setDirty(false);
    } catch (e) {
      setError('Failed to save (network error).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Temp “placeholder data” banner</h2>
        <p className="text-sm text-gray-500">
          The red site-wide bar that warns visitors the data is still being verified.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                <div className="font-semibold">{error}</div>
                {hint && <div className="mt-1 text-xs text-red-700">{hint}</div>}
                <button
                  type="button"
                  onClick={load}
                  className="mt-2 rounded border border-red-400 bg-white px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Live status */}
            {status && (
              <div
                className={`rounded-lg border p-4 ${
                  status.visible
                    ? 'border-red-300 bg-red-50'
                    : 'border-emerald-300 bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
                      status.visible ? 'bg-red-600' : 'bg-emerald-600'
                    }`}
                  >
                    {status.visible ? 'BANNER IS SHOWING' : 'BANNER IS HIDDEN'}
                  </span>
                  <span className="text-sm text-gray-700">
                    {status.activeCount}/{status.totalCount} models active
                    {' '}(need {status.threshold} to allow hiding)
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-700">
                  {enabled ? (
                    <>The banner is turned <strong>ON</strong>, so it shows on every page.</>
                  ) : !status.thresholdMet ? (
                    <>
                      You’ve turned it <strong>OFF</strong>, but it’s{' '}
                      <strong>still showing</strong> because only {status.activeCount}/
                      {status.threshold} models are complete. It hides automatically the moment
                      you reach {status.threshold} active models.
                    </>
                  ) : (
                    <>
                      It’s <strong>OFF</strong> and hidden — {status.activeCount} models are
                      live and vetted.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Toggle */}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={enabled}
                onChange={(e) => {
                  setEnabled(e.target.checked);
                  setDirty(true);
                }}
              />
              <span className="text-sm text-gray-800">
                <span className="font-semibold">Show the temp banner</span>
                <span className="block text-xs text-gray-500">
                  Turn this off when the data is ready. Safety net: it stays up until{' '}
                  {status?.threshold ?? 8} models are fully complete, even when off.
                </span>
              </span>
            </label>

            {/* Message */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800">Banner text</label>
                {defaultMessage && message !== defaultMessage && (
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                      setMessage(defaultMessage);
                      setDirty(true);
                    }}
                  >
                    Reset to default
                  </button>
                )}
              </div>
              <textarea
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
                rows={3}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setDirty(true);
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className={`rounded border px-4 py-1.5 text-sm font-semibold ${
                  saving || !dirty
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                    : 'border-gray-900 bg-gray-900 text-white hover:bg-black'
                }`}
              >
                {saving ? 'Saving…' : 'Save banner settings'}
              </button>
              {!dirty && !saving && (
                <span className="text-xs text-gray-400">No unsaved changes</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
