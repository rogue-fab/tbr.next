import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listProductIds } from "../../../../lib/data";
import { mergeWithOverlay, info } from "../../../../lib/adminStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_COOKIE_NAME = "admin_token";

function isAuthorized(request: NextRequest): boolean {
  const envToken = process.env.ADMIN_TOKEN?.trim();
  if (!envToken) return false;
  const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookieToken === envToken;
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Not authorized" },
    { status: 401 },
  );
}

/**
 * GET /api/admin/products
 * Returns an array of products. Shape is { ok: true, data: [...] } to match admin client.
 *
 * NOTE: This endpoint is auth-gated but intentionally NOT rate-limited.
 * The write-heavy endpoint is /api/admin/products/[id] which is rate-limited.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return unauthorized();
    }

    const base = await listProductIds(); // [{id}]
    const merged = mergeWithOverlay(base);
    return NextResponse.json({ ok: true, data: merged, debug: { baseCount: base.length, ...info() } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg, data: [] }, { status: 500 });
  }
}