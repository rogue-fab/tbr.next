import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "../../../../lib/adminAuth";
import {
  getTempBannerSetting,
  setTempBannerSetting,
  DEFAULT_TEMP_BANNER_MESSAGE,
} from "../../../../lib/appSettings";
import { getAllTubeBendersWithOverlay } from "../../../../lib/catalogOverlay";
import { selectPublicModels, ACTIVE_THRESHOLD } from "../../../../lib/completeness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function liveStatus() {
  const products = await getAllTubeBendersWithOverlay();
  const sel = selectPublicModels(products);
  return {
    activeCount: sel.activeCount,
    totalCount: sel.totalCount,
    threshold: ACTIVE_THRESHOLD,
    thresholdMet: sel.thresholdMet,
  };
}

/** GET /api/admin/banner → current setting + live active-model status. */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const setting = await getTempBannerSetting();
    const status = await liveStatus();
    const visible = setting.enabled || !status.thresholdMet;
    return NextResponse.json({
      ok: true,
      setting,
      status: { ...status, visible },
      defaultMessage: DEFAULT_TEMP_BANNER_MESSAGE,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST /api/admin/banner { enabled?, message? } → updated setting + status. */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    const body = (await request.json().catch(() => ({}))) as {
      enabled?: unknown;
      message?: unknown;
    };
    const next: { enabled?: boolean; message?: string } = {};
    if (typeof body.enabled === "boolean") next.enabled = body.enabled;
    if (typeof body.message === "string") next.message = body.message;

    const setting = await setTempBannerSetting(next);
    const status = await liveStatus();
    const visible = setting.enabled || !status.thresholdMet;
    return NextResponse.json({ ok: true, setting, status: { ...status, visible } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    // Most likely cause before the DDL is run: missing app_settings table.
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        hint:
          "If this says the app_settings relation is missing, run the app_settings DDL in Neon (see lib/appSettings.ts).",
      },
      { status: 500 },
    );
  }
}
