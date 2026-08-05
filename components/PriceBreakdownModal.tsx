"use client";
import { useEffect } from "react";

export type PriceBreakdown = { label: string; price: number }[];

export default function PriceBreakdownModal({
  open,
  onClose,
  model,
  breakdown,
  totalRange,
}: {
  open: boolean;
  onClose: () => void;
  model: string;
  breakdown?: PriceBreakdown;
  totalRange?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items = breakdown && breakdown.length ? breakdown : [{ label: "No vendor items published", price: 0 }];

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Price breakdown</h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          {model}
          {totalRange ? ` • ${totalRange}` : ""}
        </p>
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span>{it.label}</span>
              <span>{it.price ? `$${it.price.toLocaleString()}` : "—"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
