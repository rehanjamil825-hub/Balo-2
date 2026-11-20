/**
 * Small in-process rate limiter for public server endpoints (BALO AI chat and
 * the enquiry form). It is deliberately dependency-free: the site runs as a
 * single Node process on Lightsail (see ecosystem.config.cjs), so a process
 * map is enough to stop a single caller from burning the Gemini quota.
 *
 * If the site is ever scaled to several processes, move this to Redis.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
let lastSweep = 0;

const SWEEP_EVERY_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [key, value] of windows) {
    if (value.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the caller may try again. */
  retryAfter: number;
};

/**
 * Count one hit against `key` inside a fixed window.
 * `limit` hits are allowed per `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

/** True when every one of the supplied rules still has room. */
export function checkAll(
  rules: { key: string; limit: number; windowMs: number }[],
): RateLimitResult {
  // Evaluate without counting first, so a blocked request does not consume
  // quota from the other windows.
  let tightest: RateLimitResult = { ok: true, remaining: Infinity, retryAfter: 0 };
  for (const rule of rules) {
    const probe = peek(rule.key, rule.limit);
    if (!probe.ok) return probe;
    if (probe.remaining < tightest.remaining) tightest = probe;
  }
  for (const rule of rules) rateLimit(rule.key, rule.limit, rule.windowMs);
  return tightest;
}

function peek(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const window = windows.get(key);
  if (!window || window.resetAt <= now) return { ok: true, remaining: limit, retryAfter: 0 };
  const remaining = limit - window.count;
  if (remaining <= 0) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining, retryAfter: 0 };
}

/** Best-effort client address from the proxy headers nginx / CloudFront set. */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
}

/** Same-origin check for browser POSTs. Requests without Origin (curl, bots) pass. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) allowed.add(`${proto}://${host}`);

  if (allowed.has(origin)) return true;
  // Local development on any port.
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}
