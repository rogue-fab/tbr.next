// lib/adminAuth.ts
// Central admin authentication for /api/admin/* routes.
//
// The admin cookie holds a *signed session token* (HMAC keyed by ADMIN_TOKEN),
// NOT the raw ADMIN_TOKEN. This means the master secret is never stored
// client-side, and sessions carry their own expiry.
import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_token";

// Session lifetime. Keep in sync with the cookie maxAge set at login.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SessionPayload = { iat: number; exp: number };

function getSigningKey(): string | null {
  const t = process.env.ADMIN_TOKEN?.trim();
  return t ? t : null;
}

/** Constant-time string comparison (avoids length-dependent early throw). */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Create a signed admin session token: base64url(payload).base64url(hmac).
 * Signed with ADMIN_TOKEN so the raw secret never appears in the cookie.
 */
export function createAdminSession(nowMs: number = Date.now()): string {
  const key = getSigningKey();
  if (!key) throw new Error("ADMIN_TOKEN is not configured");
  const iat = Math.floor(nowMs / 1000);
  const payload: SessionPayload = { iat, exp: iat + SESSION_TTL_SECONDS };
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Verify a session token: valid HMAC signature (keyed by ADMIN_TOKEN) + not expired. */
export function verifyAdminSession(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): boolean {
  try {
    const key = getSigningKey();
    if (!key || !token) return false;

    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [data, sig] = parts;

    const expected = crypto.createHmac("sha256", key).update(data).digest("base64url");
    const sigBuf = Buffer.from(sig, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.exp !== "number") return false;
    if (Math.floor(nowMs / 1000) > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

/** Returns true if the request carries a valid admin session cookie. */
export function isAuthorized(request: NextRequest): boolean {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(cookie);
}

/** Standard 401 response for unauthenticated admin API access. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Not authorized" },
    { status: 401 },
  );
}
