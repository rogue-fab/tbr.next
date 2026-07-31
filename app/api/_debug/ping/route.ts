/**
 * Simple routing sanity check.
 * GET /api/_debug/ping  -> { ok: true, route: "/api/_debug/ping" }
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "../../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  return NextResponse.json({
    ok: true,
    route: "/api/_debug/ping",
    ts: Date.now(),
  });
}
