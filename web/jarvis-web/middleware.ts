import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Session management middleware for Next.js
 * Protects authenticated routes, checks session expiration, and tracks activity
 */

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/observatory",
  "/settings",
  "/api/integrations",
  "/api/sessions",
];

// Routes that should not be accessible when authenticated
const authRoutes = ["/login"];

// Public routes that don't require authentication
const publicRoutes = ["/", "/api/auth"];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check if route is protected
  if (isProtectedRoute(pathname)) {
    if (!token) {
      // Redirect to login if not authenticated
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if token is expired
    if (token.exp && Date.now() >= token.exp * 1000) {
      // Token expired, redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("error", "SessionExpired");
      return NextResponse.redirect(loginUrl);
    }

    // Check for refresh token error
    if (token.error === "RefreshAccessTokenError") {
      // Refresh token failed, force re-authentication
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("error", "RefreshTokenError");
      return NextResponse.redirect(loginUrl);
    }

    // Add security headers
    const response = NextResponse.next();

    // Add session metadata to response headers (for logging)
    response.headers.set("X-User-Id", token.sub || "");
    response.headers.set("X-Session-Valid", "true");

    // Track session activity (will be handled by NextAuth callbacks)
    // The activity tracking is done in the Redis adapter automatically

    return response;
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute(pathname) && token) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const redirectUrl = new URL(callbackUrl || "/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Configure which routes middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
