import { create } from "zustand";
import { AuthUser, UserRole } from "@/services/types";

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      user_id: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
      is_active: true,
    };
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    if (typeof window === "undefined") return null;
    const t = sessionStorage.getItem("access_token");
    return t ? decodeToken(t) : null;
  })(),
  token:
    typeof window !== "undefined"
      ? sessionStorage.getItem("access_token")
      : null,

  login: (token) => {
    const user = decodeToken(token);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("access_token", token);
      document.cookie = `access_token=${token}; path=/; SameSite=Strict; max-age=86400`;
    }
    set({ token, user });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("access_token");
      document.cookie = "access_token=; path=/; max-age=0";
    }
    set({ token: null, user: null });
  },
}));

