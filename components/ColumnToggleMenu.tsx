"use client";
import { useEffect, useRef, useState } from "react";
import { COL_COOKIE, type ColKey } from "../lib/colvis";

type Props = {
  visibleCols: ColKey[];
  setVisibleCols: (cols: ColKey[]) => void;
  allColumns: { key: string; label: string }[];
};

export default function ColumnToggleMenu({ visibleCols, setVisibleCols, allColumns }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function persistVisibility(keys: ColKey[]) {
    try {
      // cookie (so the server sees it on next request)
      document.cookie = `${COL_COOKIE}=${encodeURIComponent(JSON.stringify(keys))}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
    try {
      localStorage.setItem("tbr_cols", JSON.stringify(keys));
    } catch {}
  }

  function toggle(key: string) {
    const newVisible = visibleCols.includes(key as ColKey) 
      ? visibleCols.filter(k => k !== key)
      : [...visibleCols, key as ColKey];
    setVisibleCols(newVisible);
    persistVisibility(newVisible);
  }

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        className="px-3 py-1.5 rounded-md border bg-white dark:bg-gray-900 text-sm shadow-sm hover:bg-slate-50"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        Columns
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Toggle columns"
          className="absolute right-0 z-20 mt-2 w-56 rounded-xl border bg-white dark:bg-gray-900 shadow-lg p-2"
        >
          <div className="max-h-64 overflow-auto">
            {allColumns.map(col => (
              <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={visibleCols.includes(col.key as ColKey)}
                  onChange={() => toggle(col.key)}
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 px-2 py-1.5">
            <button
              className="text-xs px-2 py-1 rounded hover:bg-slate-100"
              onClick={() => {
                const allKeys = allColumns.map(col => col.key as ColKey);
                setVisibleCols(allKeys);
                persistVisibility(allKeys);
              }}
            >
              Show all
            </button>
            <button className="text-xs px-2 py-1 rounded hover:bg-slate-100" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
