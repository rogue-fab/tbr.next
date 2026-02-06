// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";

/**
 * POST /api/admin/logout
 * Expires the admin_token cookie (path must match login cookie path).
 * This is intentionally NOT auth-gated: expiring a cookie is always safe.
 */
export async function POST(): Promise<Response> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
