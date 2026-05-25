const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type ApiOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const explicit = window.localStorage.getItem("dentalpilot-access-token");
  if (explicit) return explicit;

  const storageKey = Object.keys(window.localStorage).find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
  if (!storageKey) return null;

  try {
    const session = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return session?.access_token ?? session?.currentSession?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token ?? (typeof window !== "undefined" ? await getSupabaseAccessToken() : null);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(response.status, message || response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function withApiFallback<T>(request: Promise<T>, fallback: T): Promise<T> {
  return request.catch((error) => {
    console.warn("DentalPilot API unavailable, using mock fallback.", error);
    return fallback;
  });
}

export const jsonBody = (body: unknown) => JSON.stringify(body);
