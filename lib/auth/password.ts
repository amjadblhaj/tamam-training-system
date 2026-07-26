import "server-only";
import bcrypt from "bcryptjs";
import { BCRYPT_COST } from "@/lib/constants";
import { logger } from "@/lib/logger";

/**
 * Hashes a plaintext password with bcrypt.
 * @throws {Error} if bcrypt itself fails (e.g. invalid input) — this is not
 * expected in normal operation, so callers should let it propagate.
 */
export async function hashPassword(plain: string): Promise<string> {
  try {
    return await bcrypt.hash(plain, BCRYPT_COST);
  } catch (err) {
    logger.error("hashPassword failed", err);
    throw new Error("Failed to hash password");
  }
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * Returns `false` (rather than throwing) if the comparison itself fails, e.g.
 * a malformed stored hash — treated the same as "wrong password" so a data
 * issue can never look like a successful login.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch (err) {
    logger.error("comparePassword failed", err);
    return false;
  }
}
