import { supabaseAuth } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_TIMEOUT_MS = 20_000;

type ApiOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(status: number, message: string, code?: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  return supabaseAuth.getAccessToken();
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token ?? (typeof window !== "undefined" ? await getSupabaseAccessToken() : null);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = options.signal ? null : new AbortController();
  const timeoutId = controller ? globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS) : undefined;
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "Request timed out", "request_timeout");
    }
    throw error;
  } finally {
    if (timeoutId) globalThis.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || response.statusText;
    let code: string | undefined;
    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
      const body = payload as { detail?: unknown; message?: unknown; code?: unknown };
      const detail = body.detail;
      if (detail && typeof detail === "object") {
        const structured = detail as { code?: unknown; message?: unknown };
        code = typeof structured.code === "string" ? structured.code : undefined;
        message = typeof structured.message === "string" ? structured.message : message;
      } else if (typeof detail === "string") {
        message = detail;
      } else {
        code = typeof body.code === "string" ? body.code : undefined;
        message = typeof body.message === "string" ? body.message : message;
      }
    } catch {
      // Keep plain-text API errors readable.
    }
    throw new ApiError(response.status, message, code, payload);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function withApiFallback<T>(request: Promise<T>, fallback: T): Promise<T> {
  return request.catch(() => {
    console.warn("AssistantDentaire API unavailable, using mock fallback.");
    return fallback;
  });
}

export const jsonBody = (body: unknown) => JSON.stringify(body);
