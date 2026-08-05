// app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400">
        {String(error ?? "")}
      </pre>
      <button
        type="button"
        className="mt-4 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
