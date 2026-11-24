"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import ThemeToggle from "./ThemeToggle"; // your existing toggle

// "Home" is hidden on phones (the logo already goes home) so the bar fits at 375px.
const links = [
  { href: "/", label: "Home", hideOnMobile: true },
  { href: "/guide", label: "Finder" },
  { href: "/compare", label: "Compare" },
  { href: "/scoring", label: "Scoring" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="
  sticky top-0 z-40 w-full
  border-b border-gray-200 dark:border-gray-700 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75
  dark:border-gray-800 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/80
">
      <div className="mx-auto max-w-6xl w-full h-14 px-4 flex items-center justify-between">
          {/* Brand link */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 hover:opacity-90 transition shrink-0"
            aria-label="Return to homepage"
          >
            <Settings className="w-4 h-4 text-gray-700 dark:text-gray-300 flex-shrink-0" />
            <span className="font-semibold tracking-tight truncate">
              <span className="inline sm:hidden text-sm">TBR</span>
              <span className="hidden sm:inline text-base">Tube Bender Reviews</span>
            </span>
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {links.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(l.href);

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={[
                    "rounded-md px-2 sm:px-3 py-1 text-sm transition",
                    "hideOnMobile" in l && l.hideOnMobile ? "hidden sm:inline-block" : "",
                    active
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
    </header>
  );
}
