import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Allow all paths without mandatory redirection for testing/development
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico, public assets
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
