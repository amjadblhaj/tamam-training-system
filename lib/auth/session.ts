import { SignJWT, jwtVerify } from "jose";

export type SessionRole = "admin" | "staff" | "student";

export interface SessionPayload {
  id: string;
  role: SessionRole;
  name: string;
  branchId: number | null;
  tenantId: string;
}

export const SESSION_COOKIE = "tamam_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours, per spec F1

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.id === "string" &&
      typeof payload.role === "string" &&
      typeof payload.name === "string" &&
      typeof payload.tenantId === "string" &&
      (payload.branchId === null || typeof payload.branchId === "number")
    ) {
      return {
        id: payload.id,
        role: payload.role as SessionRole,
        name: payload.name,
        branchId: (payload.branchId as number | null) ?? null,
        tenantId: payload.tenantId,
      };
    }
    return null;
  } catch {
    return null;
  }
}
