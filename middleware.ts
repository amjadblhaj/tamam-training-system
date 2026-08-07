import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type SessionRole } from "@/lib/auth/session";
import { SUPER_ADMIN_SESSION_COOKIE, verifySuperAdminSessionToken } from "@/lib/auth/super-admin-session";
import { isSessionValid } from "@/lib/auth/session-store";

const ADMIN_ONLY = ["/rewards", "/settings"];
const STAFF_AND_ADMIN = [
  "/dashboard",
  "/students",
  "/branches",
  "/registration-links",
  "/leaderboards",
  "/grant",
  "/excel",
  "/activity",
  "/redemptions",
];
const STUDENT_ONLY = ["/portal"];
const SUPER_ADMIN_PREFIX = "/super-admin";

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function homeFor(role: SessionRole): string {
  return role === "student" ? "/portal" : "/dashboard";
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Super Admin has its own completely separate session/cookie — never mixed
  // with tenant staff/student auth.
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
    const saToken = request.cookies.get(SUPER_ADMIN_SESSION_COOKIE)?.value;
    const saSession = saToken ? await verifySuperAdminSessionToken(saToken) : null;

    if (pathname === "/super-admin/login") {
      // Also check revocation here specifically: bouncing away from the
      // login page for a JWT that's cryptographically valid but revoked
      // server-side (e.g. a replayed post-logout cookie) would otherwise
      // send the user to /super-admin/dashboard, which itself bounces them
      // straight back via getSuperAdminSession()'s revocation check —
      // an infinite redirect loop. Route *protection* below doesn't need
      // this extra check: worst case there it's one clean extra hop, not a
      // loop, since this branch stops the loop at its only other end.
      if (saSession && (await isSessionValid(saSession.sessionId))) {
        return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!saSession) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname === "/login" || pathname === "/student-login") {
    // See the matching comment in the Super Admin branch above.
    if (session && (await isSessionValid(session.sessionId))) {
      return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    const validSession = session && (await isSessionValid(session.sessionId)) ? session : null;
    return NextResponse.redirect(new URL(validSession ? homeFor(validSession.role) : "/login", request.url));
  }

  const needsAdmin = matchesPrefix(pathname, ADMIN_ONLY);
  const needsStaffOrAdmin = matchesPrefix(pathname, STAFF_AND_ADMIN);
  const needsStudent = matchesPrefix(pathname, STUDENT_ONLY);

  if (needsAdmin || needsStaffOrAdmin || needsStudent) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (needsAdmin && session.role !== "admin") {
      return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    }
    if (needsStaffOrAdmin && session.role === "student") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    if (needsStudent && session.role !== "student") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/student-login",
    "/dashboard/:path*",
    "/students/:path*",
    "/branches/:path*",
    "/registration-links/:path*",
    "/leaderboards/:path*",
    "/grant/:path*",
    "/excel/:path*",
    "/rewards/:path*",
    "/activity/:path*",
    "/redemptions/:path*",
    "/settings/:path*",
    "/portal/:path*",
    "/super-admin/:path*",
  ],
};
