import "./globals.css";
import Header from "../components/Header";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/ThemeProvider";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://www.tubebenderreviews.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TubeBenderReviews", template: "%s | TBR" },
  description:
    "Expert reviews and transparent scoring to help you choose the perfect tube bender.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  /**
   * TEMP banner toggle:
   * - OFF by default.
   * - Set NEXT_PUBLIC_SHOW_TEMP_BANNER='1' to enable.
   */
  const showTempBanner =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHOW_TEMP_BANNER === "1";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            {showTempBanner && (
              <div
                role="alert"
                className="w-full bg-red-600 text-white text-center text-sm sm:text-base font-semibold py-2 px-3"
              >
                TEMP DATA — COME BACK LATER. This site is in placeholder mode; specs/compare may be inaccurate.
              </div>
            )}
            <Header />
            <main className="mx-auto max-w-6xl px-6 py-8 flex-1 w-full">
              {children}
            </main>
            <footer className="border-t border-muted bg-muted/40 mt-8">
              <div className="container mx-auto px-4 py-3 text-xs text-muted-foreground flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Disclosure: TubeBenderReviews is published by{" "}
                  <span className="font-medium">Joseph Gambino</span>, founder of Rogue Fabrication.
                </p>
                <p>
                  Learn more on the{" "}
                  <Link href="/about" className="underline">
                    About &amp; Disclosures
                  </Link>{" "}
                  page.
                </p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
