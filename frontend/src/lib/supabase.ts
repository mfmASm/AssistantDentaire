const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_KEY = "dentalpilot-supabase-session";
const ACCESS_TOKEN_KEY = "dentalpilot-access-token";
const REFRESH_TOKEN_KEY = "dentalpilot-refresh-token";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type SupabaseSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: SupabaseAuthUser;
};

export class SupabaseAuthError extends Error {
  status: number;
  errorCode?: string;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown, errorCode?: string) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.errorCode = errorCode;
  }
}

function assertSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new SupabaseAuthError(0, "Supabase frontend env vars are missing.", null, "missing_supabase_env");
  }
}

function authHeaders(token?: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

function persistSession(session: SupabaseSession) {
  const expiresAt = session.expires_at || (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined);
  const normalized = { ...session, expires_at: expiresAt };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  if (normalized.access_token) window.localStorage.setItem(ACCESS_TOKEN_KEY, normalized.access_token);
  if (normalized.refresh_token) window.localStorage.setItem(REFRESH_TOKEN_KEY, normalized.refresh_token);

  return normalized;
}

function readStoredSession(): SupabaseSession | null {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);

    const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (accessToken || refreshToken) return { access_token: accessToken || undefined, refresh_token: refreshToken || undefined };
  } catch {
    return null;
  }

  return null;
}

export function clearSupabaseSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function authRequest<T>(path: string, payload: unknown, token?: string): Promise<T> {
  assertSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = text;
    let message = text || response.statusText;
    let errorCode: string | undefined;

    try {
      payload = JSON.parse(text);
      if (payload && typeof payload === "object") {
        const body = payload as Record<string, unknown>;
        message = String(body.msg || body.message || body.error_description || body.error || message);
        errorCode = typeof body.error_code === "string" ? body.error_code : undefined;
      }
    } catch {
      // Supabase usually returns JSON, but plain text errors should still be handled.
    }

    throw new SupabaseAuthError(response.status, message, payload, errorCode);
  }

  return response.json() as Promise<T>;
}

export const supabaseAuth = {
  signIn: async (email: string, password: string) => {
    const session = await authRequest<SupabaseSession>("/token?grant_type=password", { email, password });
    return persistSession(session);
  },

  signUp: async (email: string, password: string) => {
    const session = await authRequest<SupabaseSession>("/signup", { email, password });
    if (session.access_token || session.refresh_token) return persistSession(session);
    return session;
  },

  getSession: async () => {
    const session = readStoredSession();
    if (!session) return null;

    const expiresAt = session.expires_at || 0;
    const shouldRefresh = Boolean(session.refresh_token && expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 60);
    if (!shouldRefresh) return session;

    try {
      const refreshed = await authRequest<SupabaseSession>("/token?grant_type=refresh_token", {
        refresh_token: session.refresh_token,
      });
      return persistSession(refreshed);
    } catch {
      clearSupabaseSession();
      return null;
    }
  },

  getAccessToken: async () => {
    const session = await supabaseAuth.getSession();
    return session?.access_token || null;
  },

  signOut: async () => {
    const token = (await supabaseAuth.getAccessToken()) || undefined;
    if (token && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: "POST",
          headers: authHeaders(token),
        });
      } catch {
        // Local cleanup still logs the browser out if Supabase logout is unreachable.
      }
    }
    clearSupabaseSession();
  },
};
