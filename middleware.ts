import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = (req.nextauth.token as any)?.role;

    // Vendor routes require vendor role
    if (pathname.startsWith("/vendor/dashboard") && role !== "vendor") {
      return NextResponse.redirect(new URL("/vendor/login", req.url));
    }

    // Admin routes require super_admin role
    if (
      pathname.startsWith("/admin/dashboard") ||
      pathname.startsWith("/admin/vendors") ||
      pathname.startsWith("/admin/qr-codes") ||
      pathname.startsWith("/admin/templates")
    ) {
      if (role !== "super_admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public paths — always allow
        if (
          pathname === "/admin/login" ||
          pathname === "/vendor/login" ||
          pathname.startsWith("/scan/") ||
          pathname.startsWith("/register/") ||
          pathname.startsWith("/reorder/") ||
          pathname.startsWith("/account/") ||
          pathname.startsWith("/api/")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/vendor/:path*",
  ],
};
