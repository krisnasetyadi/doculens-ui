import { create } from "zustand";
import { AuthUser, UserRole } from "@/services/types";
import { decodeJwtPayload } from "@/lib/jwt";

interface TokenPayload {
  sub: string;
  email: string;
  name?: string;
  role: UserRole;
  exp: number; // seconds since epoch
}

function decodePayload(token: string): TokenPayload | null {
  return decodeJwtPayload<TokenPayload>(token);
}

function decodeToken(token: string): AuthUser | null {
  const payload = decodePayload(token);
  if (!payload) return null;
  return {
    user_id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    is_active: true,
  };
}

function isExpired(payload: TokenPayload | null): boolean {
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
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
function setAuthCookie(token: string, payload: TokenPayload | null) {
  const maxAgeSeconds = payload?.exp
    ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
    : 0;
  document.cookie = `access_token=${token}; path=/; SameSite=Lax; max-age=${maxAgeSeconds}`;
}

function clearAuthCookie() {
  document.cookie = "access_token=; path=/; max-age=0";
}

/**
 * sessionStorage (used for the Authorization header) is scoped to a single
 * tab and disappears when it closes, while the `access_token` cookie (used
 * by middleware.ts for route protection) survives across tabs. Without this,
 * a freshly opened tab sees a cookie that says "logged in" but an empty
 * sessionStorage that says "logged out" — middleware lets the page render,
 * then the first API call 401s and bounces the user back to /login.
 */
function resolveToken(): string | null {
  if (typeof window === "undefined") return null;

  const sessionToken = sessionStorage.getItem("access_token");
  if (sessionToken && !isExpired(decodePayload(sessionToken))) {
    return sessionToken;
  }

  const cookieToken = getCookie("access_token");
  if (cookieToken && !isExpired(decodePayload(cookieToken))) {
    sessionStorage.setItem("access_token", cookieToken);
    return cookieToken;
  }

  return null;
}

/** Single source of truth for reading the current JWT — used by
 * RequestHandler and any one-off fetch that needs an Authorization header. */
export function getAuthToken(): string | null {
  return resolveToken();
}

export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  /** Patch the signed-in user's profile fields in place — used after a
   * successful GET/POST /auth/me so name/avatar_url (never carried by the
   * JWT itself) show up immediately without re-authenticating. */
  updateUser: (patch: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = resolveToken();

  return {
    user: initialToken ? decodeToken(initialToken) : null,
    token: initialToken,

    login: (token) => {
      const payload = decodePayload(token);
      const user = decodeToken(token);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("access_token", token);
        setAuthCookie(token, payload);
      }
      set({ token, user });
    },

    logout: () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("access_token");
        clearAuthCookie();
      }
      set({ token: null, user: null });
    },

    updateUser: (patch) => {
      set((state) => (state.user ? { user: { ...state.user, ...patch } } : state));
    },
  };
});

