import { NextRequest, NextResponse } from "next/server";
import { isJwtExpired } from "@/lib/jwt";

// /pricing is public — a guest needs to see and compare plans without
// logging in first. /payment is NOT public: a checkout has to be tied to a
// real account (a guest who paid but never registered would have no way to
// ever sign back into what they paid for), so picking a plan sends a
// logged-out visitor through /login (?next=/payment?plan=...) first.
const PUBLIC_PATHS = ["/login", "/register", "/pricing"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublicPath =
    pathname === "/" ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = req.cookies.get("access_token")?.value;
  if (!token || isJwtExpired(token)) {
    const loginUrl = new URL("/login", req.url);
    // Preserve the query string too (e.g. /payment?plan=team) — losing it
    // here would drop which plan the user picked.
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("access_token");
    return res;
  }

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
