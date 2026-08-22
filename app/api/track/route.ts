import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { insertPageView } from "../../../lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// First-party pageview beacon. Public (no auth) but only accepts same-origin-ish
// pageview pings; never stores IPs or PII. Fails open — never breaks the page.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      path?: unknown;
      referrer?: unknown;
    };

    const path = String(body?.path ?? "").slice(0, 300);
    if (!path.startsWith("/")) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Don't track the admin or API surfaces.
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    // Country from the edge header (Vercel), not the raw IP.
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      null;

    // Referrer HOST only (drop the path/query and same-site referrers).
    let referrerHost: string | null = null;
    try {
      const ref = String(body?.referrer ?? "").trim();
      if (ref) {
        const host = new URL(ref).host;
        const selfHost = req.headers.get("host") ?? "";
        if (host && !host.includes(selfHost) && !selfHost.includes(host)) {
          referrerHost = host.slice(0, 120);
        }
      }
    } catch {
      /* ignore malformed referrer */
    }

    const ua = req.headers.get("user-agent") || "";
    const device = /mobile|iphone|android/i.test(ua) ? "mobile" : "desktop";

    await insertPageView({ path, referrerHost, country, device });
    return NextResponse.json({ ok: true });
  } catch {
    // Table may not exist yet, or any transient error — never surface to the page.
    return NextResponse.json({ ok: true });
  }
}
