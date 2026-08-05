import React from "react";
export default function EmptyState({
  title = "No matching results",
  subtitle = "Try clearing filters or broadening your search.",
  children,
}: { title?: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:bg-gray-900 p-8 text-center text-slate-600">
      <div className="mx-auto mb-2 h-10 w-10 rounded-full border border-dashed border-slate-300" />
      <h3 className="text-slate-900 font-semibold">{title}</h3>
      <p className="text-sm">{subtitle}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
