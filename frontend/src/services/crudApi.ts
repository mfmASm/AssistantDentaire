import { apiFetch, jsonBody } from "@/services/api";

export function makeCrudApi<TList, TPayload = Partial<TList>>(basePath: string) {
  return {
    list: () => apiFetch<TList[]>(basePath),
    get: (id: string) => apiFetch<TList>(`${basePath}/${id}`),
    create: (payload: TPayload) => apiFetch<TList>(basePath, { method: "POST", body: jsonBody(payload) }),
    update: (id: string, payload: TPayload) => apiFetch<TList>(`${basePath}/${id}`, { method: "PUT", body: jsonBody(payload) }),
    remove: (id: string) => apiFetch<{ deleted: boolean }>(`${basePath}/${id}`, { method: "DELETE" }),
  };
}
