import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { consumeRateLimit } from "@/lib/rate-limit";
import { applySecurityHeaders } from "@/lib/security-headers";

function ensureRequestId(current: string | null) {
  if (current) {
    return current;
  }

  return crypto.randomUUID();
}

type AuthenticatedRequest = NextRequest & {
  auth?: {
    user?: {
      role?: string;
    };
  } | null;
};

export default auth(async (request: AuthenticatedRequest) => {
  const requestId = ensureRequestId(request.headers.get("x-request-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const requiresAdminOnly = pathname.startsWith("/api/admin/jobs/");
  const role = request.auth?.user?.role;
  const isAuthenticated = !!request.auth?.user;

  if (
    pathname.startsWith("/api/store/") &&
    !(pathname === "/api/store/me" || pathname.startsWith("/api/store/me/"))
  ) {
    // Simple edge-safe rate limiting for public store APIs. In prod, switch provider to Redis.
    const decision = await consumeRateLimit({ pathname, headers: request.headers });
    if (decision && !decision.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000));
      const response = NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please retry later.",
            requestId,
          },
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(decision.limit),
            "X-RateLimit-Remaining": String(decision.remaining),
            "X-RateLimit-Reset": String(Math.floor(decision.resetAt / 1000)),
          },
        },
      );
      return applySecurityHeaders(response);
    }
  }

  return continueWithAuthChecks();

  function continueWithAuthChecks() {
    if (isAdminApi) {
      if (!isAuthenticated) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: {
                code: "UNAUTHORIZED",
                message: "Authentication required.",
                requestId,
              },
            },
            { status: 401, headers: { "x-request-id": requestId } },
          ),
        );
      }

      if (requiresAdminOnly && role !== "ADMIN") {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Insufficient permissions.",
                requestId,
              },
            },
            { status: 403, headers: { "x-request-id": requestId } },
          ),
        );
      }

      if (!ADMIN_ROLES.includes((role ?? "CUSTOMER") as (typeof ADMIN_ROLES)[number])) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Insufficient permissions.",
                requestId,
              },
            },
            { status: 403, headers: { "x-request-id": requestId } },
          ),
        );
      }
    }

    if (isAdminPage) {
      if (!isAuthenticated) {
        const signInUrl = new URL("/login", request.url);
        signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
        const response = NextResponse.redirect(signInUrl);
        response.headers.set("x-request-id", requestId);
        return applySecurityHeaders(response);
      }

      if (!ADMIN_ROLES.includes((role ?? "CUSTOMER") as (typeof ADMIN_ROLES)[number])) {
        const response = NextResponse.redirect(new URL("/", request.url));
        response.headers.set("x-request-id", requestId);
        return applySecurityHeaders(response);
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set("x-request-id", requestId);
    return applySecurityHeaders(response);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
