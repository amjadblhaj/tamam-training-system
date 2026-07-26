/**
 * Minimal server-side logger. No-ops `debug`/`info` in production so
 * incidental logging never ships to prod stdout; `warn`/`error` always print
 * since they indicate something an operator should see.
 */

const isProduction = process.env.NODE_ENV === "production";

function format(level: string, message: string, context?: unknown): unknown[] {
  const parts: unknown[] = [`[${level}] ${message}`];
  if (context !== undefined) parts.push(context);
  return parts;
}

export const logger = {
  debug(message: string, context?: unknown): void {
    if (isProduction) return;
    // eslint-disable-next-line no-console -- the one place debug logging is allowed
    console.debug(...format("debug", message, context));
  },
  info(message: string, context?: unknown): void {
    if (isProduction) return;
    // eslint-disable-next-line no-console -- the one place info logging is allowed
    console.info(...format("info", message, context));
  },
  warn(message: string, context?: unknown): void {
    console.warn(...format("warn", message, context));
  },
  error(message: string, context?: unknown): void {
    console.error(...format("error", message, context));
  },
};
