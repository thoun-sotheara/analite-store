import { createHash } from "node:crypto";

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitState>();

function nowMs() {
  return Date.now();
}

function maybeCleanupBuckets(currentMs: number) {
  if (buckets.size < 2_000) return;

  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= currentMs) {
      buckets.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return "unknown";
}

export function hashIdentifier(value: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEXTAUTH_SECRET ?? "analite-rate-limit";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function checkFixedWindowRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const currentMs = nowMs();
  maybeCleanupBuckets(currentMs);

  const existing = buckets.get(params.key);

  if (!existing || existing.resetAt <= currentMs) {
    const resetAt = currentMs + params.windowMs;
    buckets.set(params.key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: params.limit,
      remaining: Math.max(0, params.limit - 1),
      retryAfterSec: Math.ceil(params.windowMs / 1000),
      resetAt,
    };
  }

  if (existing.count >= params.limit) {
    return {
      allowed: false,
      limit: params.limit,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - currentMs) / 1000)),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  buckets.set(params.key, existing);

  return {
    allowed: true,
    limit: params.limit,
    remaining: Math.max(0, params.limit - existing.count),
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - currentMs) / 1000)),
    resetAt: existing.resetAt,
  };
}
