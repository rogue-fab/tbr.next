import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { insertPageView, dailyVisitorHash } from "../../../lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|curl|wget|python|node-fetch/i;

function clip(v: unknown, n: number): string | null {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, n) : null;
}

// First-party analytics beacon (pageviews + outbound clicks). Public (no auth);
// never stores IPs or PII. Fails open — never breaks the page.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const kind = body?.kind === "outbound" ? "outbound" : "view";
    const path = String(body?.path ?? "").slice(0, 300);
    if (!path.startsWith("/")) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Don't track the admin or API surfaces.
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    const ua = req.headers.get("user-agent") || "";
    if (BOT_UA.test(ua)) return NextResponse.json({ ok: true });

    // Country from the edge header (Vercel), not the raw IP.
    const country = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;

    const selfHost = req.headers.get("host") ?? "";
    const hostOf = (raw: unknown): string | null => {
      try {
        const host = new URL(String(raw ?? "").trim()).host;
        return host ? host.slice(0, 120) : null;
      } catch {
        return null;
      }
    };

    // Referrer HOST only (drop the path/query and same-site referrers).
    let referrerHost = hostOf(body?.referrer);
    if (referrerHost && (referrerHost.includes(selfHost) || selfHost.includes(referrerHost))) referrerHost = null;

    const targetHost = kind === "outbound" ? hostOf(body?.target) : null;
    if (kind === "outbound" && !targetHost) return NextResponse.json({ ok: false }, { status: 400 });

    const device = /mobile|iphone|android/i.test(ua) ? "mobile" : "desktop";
    // IP is used only to compute today's anonymous hash, then discarded.
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";

    await insertPageView({
      kind,
      path,
      referrerHost,
      utmSource: clip(body?.utmSource, 60),
      utmCampaign: clip(body?.utmCampaign, 80),
      targetHost,
      country,
      device,
      visitor: dailyVisitorHash(ip, ua),
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Table may not exist yet, or any transient error — never surface to the page.
    return NextResponse.json({ ok: true });
  }
}
