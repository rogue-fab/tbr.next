"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Theme toggle backed by next-themes (single source of truth for the theme).
 * next-themes owns the `.dark` class on <html>; we just flip its value.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: theme isn't known until mounted on the client.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm
                 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                 dark:border-gray-700 dark:hover:bg-gray-800"
      aria-pressed={isDark}
      title="Toggle dark mode"
    >
      <span className="hidden sm:inline">{mounted ? (isDark ? "Dark" : "Light") : "Theme"}</span>
      <span aria-hidden="true">{mounted ? (isDark ? "🌙" : "☀️") : "🌓"}</span>
    </button>
  );
}
