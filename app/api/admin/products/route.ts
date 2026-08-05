import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAllTubeBendersWithOverlay } from "../../../../lib/catalogOverlay";
import { isAuthorized, unauthorized } from "../../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products
 * Returns the product roster from the single source of truth
 * (catalog identity + published DB versions). Shape: { ok: true, data: [...] }.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return unauthorized();
    }

    const data = await getAllTubeBendersWithOverlay();
    return NextResponse.json({
      ok: true,
      data,
      debug: { baseCount: data.length },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg, data: [] }, { status: 500 });
  }
}
