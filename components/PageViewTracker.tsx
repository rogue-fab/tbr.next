"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function send(payload: Record<string, unknown>) {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

// First-party analytics: a pageview ping on each client navigation, plus an
// "outbound" ping when a visitor clicks a link to another site (e.g. a maker's
// product page). Skips the admin area. Best-effort; failures are swallowed.
export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const q = new URLSearchParams(window.location.search);
    send({
      kind: "view",
      path: pathname,
      referrer: document.referrer || "",
      utmSource: q.get("utm_source") || "",
      utmCampaign: q.get("utm_campaign") || "",
    });
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (window.location.pathname.startsWith("/admin")) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol) || url.host === window.location.host) return;
      send({ kind: "outbound", path: window.location.pathname, target: url.origin });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
