import { apiFetch, jsonBody } from "@/services/api";

export type SettingPayload = { value: Record<string, unknown> };
export type TemplatePayload = Record<string, unknown>;

export const settingsApi = {
  list: () => apiFetch<SettingPayload[]>("/settings"),
  update: (key: string, value: Record<string, unknown>) => apiFetch<SettingPayload>(`/settings/${key}`, { method: "PUT", body: jsonBody({ value }) }),
  listTemplates: () => apiFetch<TemplatePayload[]>("/templates"),
  createTemplate: (payload: TemplatePayload) => apiFetch<TemplatePayload>("/templates", { method: "POST", body: jsonBody(payload) }),
  updateTemplate: (id: string, payload: TemplatePayload) => apiFetch<TemplatePayload>(`/templates/${id}`, { method: "PUT", body: jsonBody(payload) }),
  removeTemplate: (id: string) => apiFetch<{ deleted: boolean }>(`/templates/${id}`, { method: "DELETE" }),
};
