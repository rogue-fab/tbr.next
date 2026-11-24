import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "../../../../lib/adminAuth";
import { getAnalytics, PAGE_VIEWS_DDL } from "../../../../lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const data = await getAnalytics();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const missingTable = /page_views/.test(msg) && /does not exist|undefined_table/i.test(msg);
    return NextResponse.json(
      {
        ok: false,
        error: missingTable ? "Analytics table not created yet — no visits have been recorded." : msg,
        setupSql: missingTable ? PAGE_VIEWS_DDL : undefined,
        hint:
          "If this says the page_views relation is missing, run the analytics DDL in Neon (see lib/analytics.ts).",
      },
      { status: 500 },
    );
  }
}
