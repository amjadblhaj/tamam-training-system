import "server-only";
import { hashPassword } from "@/lib/auth/password";

/**
 * Students authenticate with phone number only now (no password) — this
 * satisfies the students.password NOT NULL column with a hash of an
 * unguessable random value that is never checked against anywhere.
 */
export async function generatePlaceholderPasswordHash(): Promise<string> {
  const random = crypto.randomUUID() + crypto.randomUUID();
  return hashPassword(random);
}
