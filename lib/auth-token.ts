import { decodeJwtPayload, isJwtExpired } from "@/lib/jwt";

const TOKEN_KEY = "access_token";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * sessionStorage (used for the Authorization header) is scoped to a single
 * tab and disappears when it closes, while the `access_token` cookie (used
 * by middleware.ts for route protection) survives across tabs. Without the
 * cookie fallback, a freshly opened tab sees a cookie that says "logged in"
 * but an empty sessionStorage that says "logged out" — middleware lets the
 * page render, then the first API call 401s and bounces the user to /login.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  if (sessionToken && !isJwtExpired(sessionToken)) return sessionToken;

  const cookieToken = readCookie(TOKEN_KEY);
  if (cookieToken && !isJwtExpired(cookieToken)) {
    sessionStorage.setItem(TOKEN_KEY, cookieToken);
    return cookieToken;
  }

  return null;
}

export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Cookie lifetime mirrors the token's own `exp` claim instead of a hardcoded
 * duration, so it can never drift out of sync with the JWT it carries.
 *
 * SameSite=Lax, not Strict: the payment flow redirects out to
 * checkout.stripe.com and back — a Strict cookie is dropped by the browser
 * on that cross-site return navigation, so middleware.ts sees no
 * access_token and bounces an actually-logged-in user to /login. Lax still
 * withholds the cookie from cross-site POST/PUT/DELETE (the real CSRF
 * surface); it only allows top-level GET navigations like this one. */
export function storeAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  const exp = decodeJwtPayload<{ exp?: number }>(token)?.exp;
  const maxAgeSeconds = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 0;
  sessionStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax; max-age=${maxAgeSeconds}`;
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}
