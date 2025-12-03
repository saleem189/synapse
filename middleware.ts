// ================================
// Next.js Middleware
// ================================
// Handles authentication and route protection with role-based redirects

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // If user is admin, redirect them away from chat routes
    if (token?.role === "ADMIN") {
      // Admin trying to access chat - redirect to admin dashboard
      if (pathname.startsWith("/chat")) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // If user is NOT admin, redirect them away from admin routes
    if (token && token.role !== "ADMIN") {
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/chat", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Check if user is authorized
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/api/auth")
        ) {
          return true;
        }

        // Require authentication for protected routes
        return !!token;
      },
    },
  }
);

// Configure which routes to protect
export const config = {
  matcher: [
    // Protect chat routes
    "/chat/:path*",
    // Protect admin routes
    "/admin/:path*",
    // Protect API routes (except auth)
    "/api/rooms/:path*",
    "/api/messages/:path*",
    "/api/users/:path*",
    "/api/admin/:path*",
  ],
};
