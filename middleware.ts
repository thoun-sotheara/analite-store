import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveRoleFromEmail } from "@/lib/auth/role";

const protectedRoutes = ["/dashboard", "/downloads", "/library", "/profile", "/checkout", "/success"];
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@analite.store").toLowerCase();

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const needsAuth = protectedRoutes.some((route) => pathname.startsWith(route));
  const hasSession = Boolean(token?.email);

  if (needsAuth && !hasSession) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("mode", "signin");
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/dashboard")) {
    const userEmail = (token?.email ?? "").toLowerCase();
    const userRole = typeof token?.role === "string" ? token.role : resolveRoleFromEmail(userEmail, ADMIN_EMAIL);
    if (userRole !== "ADMIN") {
      const redirectUrl = new URL("/", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/downloads/:path*",
    "/library/:path*",
    "/profile/:path*",
    "/checkout/:path*",
    "/success/:path*",
  ],
};
