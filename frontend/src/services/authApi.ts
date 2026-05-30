import { ApiError, apiFetch, jsonBody } from "@/services/api";
import { supabaseAuth } from "@/lib/supabase";

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

export const authApi = {
  signIn: async (email: string, password: string) => {
    const session = await supabaseAuth.signIn(email, password);
    await authApi.ensureOnboarded();
    return session;
  },

  signUp: async (email: string, password: string) => {
    const session = await supabaseAuth.signUp(email, password);
    if (session.access_token) {
      await authApi.ensureOnboarded();
    }
    return session;
  },

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
        await authApi.onboard({ full_name: session?.user?.email });
        return authApi.me();
      }
      throw error;
    }
  },
};
