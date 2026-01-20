// app/api/admin/products/[id]/route.ts
// Legacy endpoint: direct overlay reads/writes for one product.
// This endpoint is intentionally disabled to prevent "API shotgun" behavior and
// to force the explicit Draft/Publish workflow.

import { NextResponse } from "next/server";

function gone(): Response {
  return NextResponse.json(
    {
      ok: false,
      error:
        "410 Gone: legacy endpoint disabled. Use /api/admin/products (list/read) and /api/admin/products/[id]/draft + /publish for writes.",
    },
    { status: 410 },
  );
}

export async function GET(): Promise<Response> {
  return gone();
}

export async function POST(): Promise<Response> {
  return gone();
}
