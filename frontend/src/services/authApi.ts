import { apiFetch, jsonBody } from "@/services/api";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email?: string;
  };
};

async function supabaseAuth<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function persistSession(session: AuthResponse) {
  if (session.access_token) window.localStorage.setItem("dentalpilot-access-token", session.access_token);
  if (session.refresh_token) window.localStorage.setItem("dentalpilot-refresh-token", session.refresh_token);
}

export const authApi = {
  signIn: async (email: string, password: string) => {
    const session = await supabaseAuth<AuthResponse>("/token?grant_type=password", { email, password });
    persistSession(session);
    return session;
  },
  signUp: async (email: string, password: string) => {
    const session = await supabaseAuth<AuthResponse>("/signup", { email, password });
    persistSession(session);
    return session;
  },
  logout: () => {
    window.localStorage.removeItem("dentalpilot-access-token");
    window.localStorage.removeItem("dentalpilot-refresh-token");
  },
  me: () => apiFetch("/auth/me"),
  onboard: (payload: Record<string, unknown>) => apiFetch("/auth/onboard", { method: "POST", body: jsonBody(payload) }),
};
