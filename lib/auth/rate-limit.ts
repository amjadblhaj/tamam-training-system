import "server-only";

// In-memory limiter — resets per server instance/cold start. Fine for a single
// long-running Node process; a multi-instance deployment needs a shared store
// (e.g. Upstash Redis) for this guarantee to hold across instances.
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

export function checkLoginRateLimit(key: string): boolean {
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
