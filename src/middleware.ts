import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = "tax_admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hanya periksa rute /admin
  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    const hasSession = !!sessionCookie && sessionCookie.includes(".");

    if (!hasSession && !isLoginPage) {
      // Belum login, arahkan ke login
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (hasSession && isLoginPage) {
      // Sudah punya sesi dan membuka /admin/login, arahkan ke dashboard
      const dashboardUrl = new URL("/admin", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
