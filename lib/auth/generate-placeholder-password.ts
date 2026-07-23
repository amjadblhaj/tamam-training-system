import "server-only";
import bcrypt from "bcryptjs";

// Students authenticate with phone number only now (no password) — this
// satisfies the students.password NOT NULL column with a hash of an
// unguessable random value that is never checked against anywhere.
export async function generatePlaceholderPasswordHash(): Promise<string> {
  const random = crypto.randomUUID() + crypto.randomUUID();
  return bcrypt.hash(random, 12);
}
