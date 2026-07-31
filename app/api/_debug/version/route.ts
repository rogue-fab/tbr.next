import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "../../../../lib/adminAuth";

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) return unauthorized();

  // Vercel provides these at build/runtime depending on plan/config.
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    null;

  const ref =
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ||
    null;

  return NextResponse.json({
    ok: true,
    sha,
    ref,
    node: process.version,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
  });
}
