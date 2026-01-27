// lib/rateLimit.ts
import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export function getClientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for. Take the first IP in the list.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.ip ?? "0.0.0.0";
}

/**
 * Small stable hash for scoping rate limits per client device without new deps.
 * (Not cryptographic; just reduces collisions vs raw UA strings.)
 */
function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i); // djb2 xor variant
  }
  // Convert to unsigned 32-bit and hex
  return (hash >>> 0).toString(16);
}

/**
 * Client identifier for auth throttling: IP + hashed user-agent.
 * Prevents one person on a shared NAT/static IP from locking out everyone.
 */
export function getClientId(request: NextRequest): string {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "unknown";
  return `${ip}:${hashString(ua)}`;
}

let redisInstance: Redis | null = null;

function isFailOpenEnabled(): boolean {
  // Default to fail-open: rate limiting should not take down admin tooling.
  // Set RATE_LIMIT_FAIL_OPEN=0 (or "false") to force fail-closed behavior.
  const v = (process.env.RATE_LIMIT_FAIL_OPEN ?? "1").toLowerCase().trim();
  if (v === "0" || v === "false" || v === "no") return false;
  return true;
}

/**
 * Get Redis client, with defensive handling for missing env vars.
 * In production, throws if env vars are missing (fail closed).
 * In dev, returns null to allow fail-open behavior.
 */
function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  // Support both "standard" Upstash env names and Vercel Marketplace integration names.
  const url =
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_KV_REST_API_URL ??
    null;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_KV_REST_API_TOKEN ??
    null;

  const urlTrimmed = (url ?? "").trim();
  const tokenTrimmed = (token ?? "").trim();

  if (!urlTrimmed || !tokenTrimmed) {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      // In production, fail closed
      const msg =
        "Missing Upstash Redis env vars. Expected either " +
        "(UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) or " +
        "(UPSTASH_REDIS_KV_REST_API_URL, UPSTASH_REDIS_KV_REST_API_TOKEN). " +
        "Failing closed in production.";
      console.error(`[rateLimit] ${msg}`);
      throw new Error(msg);
    }
    // In dev, return null to allow fail-open behavior
    console.warn("[rateLimit] Missing Upstash Redis env vars. Rate limiting disabled in dev.");
    return null;
  }

  redisInstance = new Redis({ url: urlTrimmed, token: tokenTrimmed });
  return redisInstance;
}

// Rate limiter for authentication endpoints (5 requests per 60 seconds)
// Created lazily to handle missing Redis in dev
let _ratelimitAuth: Ratelimit | null = null;
function getRatelimitAuth(): Ratelimit {
  if (_ratelimitAuth) return _ratelimitAuth;
  const redis = getRedis();
  if (!redis) {
    // In dev with missing Redis, create a dummy that always allows (fail open)
    _ratelimitAuth = {
      limit: async () => ({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60000 }),
    } as unknown as Ratelimit;
    return _ratelimitAuth;
  }
  // TS sometimes fails to narrow here depending on upstream types; force it.
  const redisClient = redis as Redis;
  _ratelimitAuth = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
  });
  return _ratelimitAuth;
}
export const ratelimitAuth = new Proxy({} as Ratelimit, {
  get(_target, prop) {
    return getRatelimitAuth()[prop as keyof Ratelimit];
  },
});

// Rate limiter for admin READ endpoints (e.g. list pages)
// Keep this tighter than write limits so page refresh/poll bugs don't spike Redis.
let _ratelimitAdminRead: Ratelimit | null = null;
function getRatelimitAdminRead(): Ratelimit {
  if (_ratelimitAdminRead) return _ratelimitAdminRead;
  const redis = getRedis();
  if (!redis) {
    // Dev fail-open
    _ratelimitAdminRead = {
      limit: async () => ({ success: true, limit: 60, remaining: 59, reset: Date.now() + 60000 }),
    } as unknown as Ratelimit;
    return _ratelimitAdminRead;
  }
  // TS sometimes fails to narrow here depending on upstream types; force it.
  const redisClient = redis as Redis;
  _ratelimitAdminRead = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: true,
  });
  return _ratelimitAdminRead;
}
export const ratelimitAdminRead = new Proxy({} as Ratelimit, {
  get(_target, prop) {
    return getRatelimitAdminRead()[prop as keyof Ratelimit];
  },
});

// Rate limiter for admin API endpoints (600 requests per 60 seconds)
// Created lazily to handle missing Redis in dev
let _ratelimitAdmin: Ratelimit | null = null;
function getRatelimitAdmin(): Ratelimit {
  if (_ratelimitAdmin) return _ratelimitAdmin;
  const redis = getRedis();
  if (!redis) {
    // Dev fail-open
    _ratelimitAdmin = {
      limit: async () => ({ success: true, limit: 600, remaining: 599, reset: Date.now() + 60000 }),
    } as unknown as Ratelimit;
    return _ratelimitAdmin;
  }
  // TS sometimes fails to narrow here depending on upstream types; force it.
  const redisClient = redis as Redis;
  _ratelimitAdmin = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(600, "60 s"),
    analytics: true,
  });
  return _ratelimitAdmin;
}
export const ratelimitAdmin = new Proxy({} as Ratelimit, {
  get(_target, prop) {
    return getRatelimitAdmin()[prop as keyof Ratelimit];
  },
});

// Backwards-compatible alias for ratelimitAdmin
export const ratelimitAdminWrite = ratelimitAdmin;

export async function enforceRateLimit(
  limiter: Ratelimit,
  keyParts: (string | number)[],
) {
  const key = keyParts.map(String).join(":");
  try {
    const result = await limiter.limit(key);
    return {
      ok: result.success,
      retryAfter: result.reset
        ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
        : 60,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    console.warn(`[rateLimit] limiter.limit failed (key=${key}) - ${msg}`);

    // Default: fail-open so admin and critical paths don't crash when Upstash is unreachable.
    // If you want strict protection, set RATE_LIMIT_FAIL_OPEN=0.
    if (isFailOpenEnabled()) {
      return {
        ok: true,
        retryAfter: 0,
        remaining: undefined,
        reset: undefined,
      };
    }

    return {
      ok: false,
      retryAfter: 60,
      remaining: undefined,
      reset: undefined,
    };
  }
}

/**
 * Check if a client identifier is locked out due to too many failed auth attempts.
 * Returns lockout duration in seconds if locked, null if not locked.
 */
export async function checkAuthLockout(id: string): Promise<number | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    const lockKey = `admin_auth_lock:${id}`;
    const ttl = await redis.ttl(lockKey);
    if (ttl > 0) {
      return ttl;
    }
    return null;
  } catch (err) {
    console.error("[rateLimit] Failed to check auth lockout:", err);
    // Fail closed in production
    if (process.env.NODE_ENV === "production") {
      return 3600; // Assume locked if Redis fails in production
    }
    return null;
  }
}

/**
 * Increment failed auth attempt counter and apply lockout if threshold reached.
 * @param id - Client identifier (e.g., IP + UA hash)
 * @returns true if lockout was triggered, false otherwise
 */
export async function recordAuthFailure(id: string): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    const failKey = `admin_auth_fail:${id}`;
    const lockKey = `admin_auth_lock:${id}`;

    // Increment failure count with 10 minute expiry
    const count = await redis.incr(failKey);
    await redis.expire(failKey, 600); // 10 minutes

    // If 10 or more failures, set lockout for 1 hour
    if (count >= 10) {
      await redis.set(lockKey, "1", { ex: 3600 }); // 1 hour lockout
      return true;
    }

    return false;
  } catch (err) {
    console.error("[rateLimit] Failed to record auth failure:", err);
    // Don't block on Redis errors for failure tracking
    return false;
  }
}

/**
 * Clear auth failure counter and lockout (call on successful auth).
 */
export async function clearAuthFailures(id: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(`admin_auth_fail:${id}`);
    await redis.del(`admin_auth_lock:${id}`);
  } catch (err) {
    console.error("[rateLimit] Failed to clear auth failures:", err);
    // Non-critical, don't throw
  }
}

