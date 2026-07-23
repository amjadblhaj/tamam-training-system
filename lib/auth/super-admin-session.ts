import { SignJWT, jwtVerify } from "jose";

export interface SuperAdminSessionPayload {
  id: string;
  username: string;
}

export const SUPER_ADMIN_SESSION_COOKIE = "mazaya_sa_session";
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSuperAdminSessionToken(payload: SuperAdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SUPER_ADMIN_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySuperAdminSessionToken(token: string): Promise<SuperAdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.id === "string" && typeof payload.username === "string") {
      return { id: payload.id, username: payload.username };
    }
    return null;
  } catch {
    return null;
  }
}
