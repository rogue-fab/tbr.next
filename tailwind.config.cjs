/** @type {import('tailwindcss').Config} */
module.exports = {
  // Class-based dark mode: the .dark class on <html> (set by next-themes) drives
  // all `dark:` variants. Must NOT be "media" or the toggle has no effect.
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
