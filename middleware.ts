import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type SessionRole } from "@/lib/auth/session";
import { SUPER_ADMIN_SESSION_COOKIE, verifySuperAdminSessionToken } from "@/lib/auth/super-admin-session";

const ADMIN_ONLY = ["/rewards", "/settings"];
const STAFF_AND_ADMIN = ["/dashboard", "/students", "/branches", "/registration-links", "/grant", "/excel", "/activity"];
const STUDENT_ONLY = ["/portal"];
const SUPER_ADMIN_PREFIX = "/super-admin";

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function homeFor(role: SessionRole) {
  return role === "student" ? "/portal" : "/dashboard";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Super Admin has its own completely separate session/cookie — never mixed
  // with tenant staff/student auth.
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
    const saToken = request.cookies.get(SUPER_ADMIN_SESSION_COOKIE)?.value;
    const saSession = saToken ? await verifySuperAdminSessionToken(saToken) : null;

    if (pathname === "/super-admin/login") {
      if (saSession) {
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

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(session ? homeFor(session.role) : "/login", request.url));
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
    "/dashboard/:path*",
    "/students/:path*",
    "/branches/:path*",
    "/registration-links/:path*",
    "/grant/:path*",
    "/excel/:path*",
    "/rewards/:path*",
    "/activity/:path*",
    "/settings/:path*",
    "/portal/:path*",
    "/super-admin/:path*",
  ],
};
