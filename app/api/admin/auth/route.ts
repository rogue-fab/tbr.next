// app/api/admin/auth/route.ts
import { NextRequest } from 'next/server';
import { ok, badRequest } from '../../../../lib/http';
import {
  ADMIN_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createAdminSession,
  constantTimeEqual,
} from '../../../../lib/adminAuth';

import {
  getClientIp,
  getClientId,
  ratelimitAuth,
  enforceRateLimit,
  checkAuthLockout,
  recordAuthFailure,
  clearAuthFailures,
} from '../../../../lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const clientId = getClientId(request);

  try {
    const { token } = await request.json();

    if (!token) {
      return badRequest('Token is required');
    }

    const adminToken = process.env.ADMIN_TOKEN?.trim();
    if (!adminToken) {
      return badRequest('Admin token not configured');
    }

    const submittedToken = String(token).trim();

    // If correct token is provided, allow login even if this client is currently rate-limited/locked out.
    // (If an attacker has the correct token, they already have admin access.)
    if (constantTimeEqual(submittedToken, adminToken)) {
      await clearAuthFailures(clientId);

      const response = ok({ message: 'Authentication successful' });
      // Store a signed session token (HMAC keyed by ADMIN_TOKEN), NOT the raw secret.
      response.cookies.set(ADMIN_COOKIE_NAME, createAdminSession(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // Admin UI is same-site; Strict is a cheap hardening win.
        // If you ever embed admin in another site/context, switch back to 'lax'.
        sameSite: 'strict',
        // Must be visible to BOTH /admin pages and /api/admin/* routes.
        // Using '/' keeps auth consistent across the admin surface.
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
      });
      return response;
    }

    // Wrong token: enforce lockout + rate limit
    const lockoutSeconds = await checkAuthLockout(clientId);
    if (lockoutSeconds !== null) {
      return Response.json(
        { error: 'Too many attempts' },
        {
          status: 429,
          headers: { 'Retry-After': String(lockoutSeconds) },
        },
      );
    }

    const rateLimitResult = await enforceRateLimit(ratelimitAuth, ['admin_auth', clientId]);
    if (!rateLimitResult.ok) {
      return Response.json(
        { error: 'Too many attempts' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitResult.retryAfter ?? 60) },
        },
      );
    }

    await recordAuthFailure(clientId);
    return badRequest('Invalid credentials');
  } catch {
    await recordAuthFailure(clientId);
    return badRequest('Invalid credentials');
  }
}
