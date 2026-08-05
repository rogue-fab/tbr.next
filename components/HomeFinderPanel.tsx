"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildQuery, clearAll, type QueryShape } from "../lib/url";

// tiny debounce helper
function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, ms: number) {
  const t = useRef<number | undefined>(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: Parameters<T>) => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => fn(...args), ms);
  }, [fn, ms]);
}

// coerce URL -> union types we expect
function sanitizePower(v: string | null): QueryShape["power"] {
  const s = (v ?? "").toLowerCase();
  return s === "manual" || s === "hydraulic" ? s : "any";
}
function asOne(v: string | null): "1" | undefined {
  return v === "1" || (v ?? "").toLowerCase() === "true" ? "1" : undefined;
}

export default function HomeFinderPanel() {
  const router = useRouter();
  const sp = useSearchParams();

  // derive initial state from URL with proper coercion
  const initial = useMemo<QueryShape>(() => {
    return {
      q: sp.get("q") ?? "",
      power: sanitizePower(sp.get("power")),
      originUS: asOne(sp.get("originUS")),
      originTW: asOne(sp.get("originTW")),
      capacityMin: sp.get("capacityMin") ?? "",
      priceMax: sp.get("priceMax") ?? "",
    };
  }, [sp]);

  const [form, setForm] = useState<QueryShape>(initial);

  // sync if URL changes externally
  useEffect(() => setForm(initial), [initial]);

  const commit = useCallback((next: Partial<QueryShape>) => {
    const merged: QueryShape = { ...form, ...next };
    const q = buildQuery(merged, sp);
    router.replace(`?${q.toString()}`);
    setForm(merged);
  }, [form, router, sp]);

  const commitDebounced = useDebouncedCallback(commit, 220);

  return (
    <form
      className="rounded-md border bg-white dark:bg-gray-900 p-4 space-y-3 text-sm dark:bg-gray-900 dark:border-gray-800"
      onSubmit={(e) => e.preventDefault()}
    >
      <div>
        <label className="block mb-1 font-medium">Search</label>
        <input
          type="text"
          className="w-full rounded-md border px-3 py-2 dark:bg-gray-950 dark:border-gray-800"
          placeholder="Search brand or model..."
          value={form.q ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setForm((f) => ({ ...f, q: v }));
            commitDebounced({ q: v });
          }}
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Power</label>
        <select
          className="w-full rounded-md border px-3 py-2 dark:bg-gray-950 dark:border-gray-800"
          value={form.power ?? "any"}
          onChange={(e) => commit({ power: sanitizePower(e.target.value) })}
        >
          <option value="any">Any</option>
          <option value="manual">Manual</option>
          <option value="hydraulic">Hydraulic</option>
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Origin</label>
        <div className="flex gap-4 items-center">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.originUS === "1"}
              onChange={(e) => commit({ originUS: e.target.checked ? "1" : undefined })}
            />
            <span>US</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.originTW === "1"}
              onChange={(e) => commit({ originTW: e.target.checked ? "1" : undefined })}
            />
            <span>TW</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 font-medium">Capacity ≥ (in)</label>
          <input
            inputMode="decimal"
            className="w-full rounded-md border px-3 py-2 dark:bg-gray-950 dark:border-gray-800"
            value={form.capacityMin ?? ""}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.]/g, "");
              setForm((f) => ({ ...f, capacityMin: v }));
              commitDebounced({ capacityMin: v });
            }}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Max Price ($)</label>
          <input
            inputMode="numeric"
            className="w-full rounded-md border px-3 py-2 dark:bg-gray-950 dark:border-gray-800"
            value={form.priceMax ?? ""}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setForm((f) => ({ ...f, priceMax: v }));
              commitDebounced({ priceMax: v });
            }}
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          className="w-full rounded-md border px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-gray-800"
          onClick={() => {
            const q = clearAll(sp);
            router.replace(`?${q.toString()}`);
            setForm({
              q: "",
              power: "any",
              originUS: undefined,
              originTW: undefined,
              capacityMin: "",
              priceMax: "",
            });
          }}
        >
          Clear all (resets search)
        </button>
      </div>
    </form>
  );
}
