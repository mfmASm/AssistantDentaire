import { ApiError, apiFetch, jsonBody } from "@/services/api";
import { supabaseAuth } from "@/lib/supabase";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

export type AuthMe = {
  id: string;
  email?: string;
  full_name?: string;
  role: string;
  cabinet_id: string;
  cabinet?: Record<string, unknown> | null;
  cabinet_setup_complete?: boolean;
};

export type OnboardResult = {
  cabinet: Record<string, unknown> | null;
  profile: Record<string, unknown>;
  cabinet_setup_complete?: boolean;
};

function authMeFromOnboard(result: OnboardResult, email?: string): AuthMe {
  return {
    id: String(result.profile.id || ""),
    email: typeof result.profile.email === "string" ? result.profile.email : email,
    full_name: typeof result.profile.full_name === "string" ? result.profile.full_name : undefined,
    role: typeof result.profile.role === "string" ? result.profile.role : "admin",
    cabinet_id: typeof result.profile.cabinet_id === "string" ? result.profile.cabinet_id : "",
    cabinet: result.cabinet,
    cabinet_setup_complete: result.cabinet_setup_complete,
  };
}

export const authApi = {
  signIn: (email: string, password: string) => supabaseAuth.signIn(email, password),

  signUp: (email: string, password: string) => supabaseAuth.signUp(email, password),

  logout: () => supabaseAuth.signOut(),

  session: () => supabaseAuth.getSession(),

  me: () => apiFetch<AuthMe>("/auth/me"),

  onboard: (payload: Record<string, unknown> = {}) =>
    apiFetch<OnboardResult>("/auth/onboard", { method: "POST", body: jsonBody(payload) }),

  ensureOnboarded: async () => {
    try {
      return await authApi.me();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const session = await authApi.session();
        const result = await authApi.onboard({ full_name: session?.user?.email });
        return authMeFromOnboard(result, session?.user?.email);
      }
      throw error;
    }
  },
};
