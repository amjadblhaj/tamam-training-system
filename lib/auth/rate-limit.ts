import "server-only";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

// In-memory fallback — resets per server instance/cold start, and doesn't
// stop a distributed (multi-IP) attacker. Used automatically when Upstash
// isn't configured (e.g. local dev without the env vars set), and as a
// safety net if Upstash itself is unreachable.
const attempts = new Map<string, number[]>();

function checkInMemory(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    return false;
  }

  recent.push(now);
  attempts.set(key, recent);
  return true;
}

let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    ratelimit = null;
    return ratelimit;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, `${WINDOW_MS} ms`),
    prefix: "tamam-ratelimit",
  });
  return ratelimit;
}

/**
 * Rate-limits login attempts by key (e.g. `${RATE_LIMIT_SCOPE.STAFF_LOGIN}:${getClientIp()}`).
 *
 * Backed by Upstash Redis when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
 * are set — persists across deploys and instances, the real defense against
 * a distributed attacker. Falls back to an in-memory limiter if those aren't
 * configured, or if Upstash itself errors (fail open to "still rate limit
 * something" rather than fail closed to "no protection at all").
 */
export async function checkLoginRateLimit(key: string): Promise<boolean> {
  const limiter = getRatelimit();
  if (!limiter) return checkInMemory(key);

  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (err) {
    logger.error("Upstash rate limit check failed, falling back to in-memory limiter", err);
    return checkInMemory(key);
  }
}

/** Best-effort caller IP, used only to key the login rate limiter. */
export function getClientIp(): string {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
