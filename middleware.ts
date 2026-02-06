import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Admin API guard (fail-closed).
 * - Allows /api/admin/* only when admin is configured (ADMIN_TOKEN present).
 * - Optional hard kill-switch via DISABLE_ADMIN_ENDPOINTS.
 *
 * Note: Actual auth (token verification) is enforced inside the /api/admin routes.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only guard admin routes
  if (!pathname.startsWith("/api/admin")) return NextResponse.next();

  // Explicit kill switch (useful for incident response)
  const disabled =
    process.env.DISABLE_ADMIN_ENDPOINTS === "1" ||
    process.env.DISABLE_ADMIN_ENDPOINTS === "true";
  if (disabled) {
    return NextResponse.json(
      { error: "Admin endpoints are disabled in this environment." },
      { status: 403 },
    );
  }

  // Fail closed unless admin is configured for this environment
  const hasToken = Boolean(process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN.trim());
  if (!hasToken) {
    return NextResponse.json(
      { error: "Admin endpoints are not configured in this environment." },
      { status: 403 },
    );
  }
  return NextResponse.next();
}

// Run only for admin API paths
export const config = {
  matcher: ["/api/admin/:path*"],
};
