import { create } from "zustand";
import { AuthUser, UserRole } from "@/services/types";
import { decodeJwtPayload } from "@/lib/jwt";
import { clearAuthToken, getAuthToken, storeAuthToken } from "@/lib/auth-token";
import { getQueryClient } from "@/lib/query/query-client";

interface TokenPayload {
  sub: string;
  email: string;
  name?: string;
  role: UserRole;
}

function decodeToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload<TokenPayload>(token);
  if (!payload) return null;
  return {
    user_id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    is_active: true,
  };
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
  const initialToken = getAuthToken();

  return {
    user: initialToken ? decodeToken(initialToken) : null,
    token: initialToken,

    login: (token) => {
      storeAuthToken(token);
      set({ token, user: decodeToken(token) });
    },

    logout: () => {
      clearAuthToken();
      // Cached server data belongs to the user who just left; the next user
      // signing in on this tab must never see it.
      getQueryClient().clear();
      set({ token: null, user: null });
    },

    updateUser: (patch) => {
      set((state) => (state.user ? { user: { ...state.user, ...patch } } : state));
    },
  };
});
