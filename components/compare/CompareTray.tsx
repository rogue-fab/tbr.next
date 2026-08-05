"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEYS = ["tbr.compare","compare","compareIds","comparePicks"];

function readIds(): string[] {
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const val = JSON.parse(raw);
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === "string") return val.split(",").filter(Boolean);
    } catch {
      // ignore
    }
  }
  return [];
}

export default function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setIds(readIds());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-700 dark:bg-gray-900/70">
          <p className="text-sm">
            {ids.length} model{ids.length > 1 ? "s" : ""} selected for comparison
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                KEYS.forEach((k) => localStorage.removeItem(k));
                setIds([]);
              }}
              className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:bg-gray-800"
            >
              Clear
            </button>
            <Link href={`/compare?ids=${encodeURIComponent(ids.join(","))}`}>
              <span className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700">
                Open comparison
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
