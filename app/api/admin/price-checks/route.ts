import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "../../../../lib/adminAuth";
import { getPriceChecks } from "../../../../lib/appSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: last price-scrub result per model (see lib/appSettings.ts). */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  return NextResponse.json({ ok: true, data: await getPriceChecks() });
}
