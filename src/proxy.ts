import { NextResponse, type NextRequest } from "next/server";
import {
  corsHeaders,
  corsPreflightHeaders,
  isOriginAllowed,
} from "@/lib/security/cors";
import { CSRF_COOKIE } from "@/lib/security/constants";

export const CSRF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/v1/") && request.method === "OPTIONS") {
      const origin = request.headers.get("origin");
      const selfOrigin = request.nextUrl.origin;

      if (!origin || !isOriginAllowed(origin, selfOrigin)) {
        return NextResponse.json(
          {
            apiVersion: "v1",
            ok: false,
            error: {
              code: "origin_not_allowed",
              message: "Requests from this origin are not allowed.",
            },
          },
          { status: 403, headers: corsHeaders(origin, selfOrigin) },
        );
      }

      return new NextResponse(null, {
        status: 204,
        headers: corsPreflightHeaders(origin, selfOrigin),
      });
    }

    return NextResponse.next();
  }

  const response = NextResponse.next();

  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set({
      name: CSRF_COOKIE,
      value: crypto.randomUUID(),
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
