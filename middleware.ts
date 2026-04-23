import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/config/demo";

const protectedRoutes = ["/dashboard", "/downloads", "/library"];
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "demo@analite.store").toLowerCase();

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard")) {
    const demoEmail = decodeURIComponent(request.cookies.get("demo_user_email")?.value ?? "").toLowerCase();
    if (demoEmail !== ADMIN_EMAIL) {
      const redirectUrl = new URL("/auth", request.url);
      redirectUrl.searchParams.set("mode", "signin");
      redirectUrl.searchParams.set("redirect", "/dashboard");
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (DEMO_MODE) {
    return NextResponse.next();
  }

  const needsAuth = protectedRoutes.some((route) => pathname.startsWith(route));
  const hasSession = Boolean(
    request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value,
  );

  if (needsAuth && !hasSession) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/downloads/:path*", "/library/:path*"],
};
