import { apiFetch, jsonBody } from "@/services/api";

export type SettingPayload<T = unknown> = {
  id?: string;
  cabinet_id?: string;
  key?: string;
  value: T;
  created_at?: string;
  updated_at?: string;
};
export type TemplatePayload = Record<string, unknown>;

export const getSettings = () => apiFetch<SettingPayload[]>("/settings");
export const getSetting = <T = unknown>(key: string) => apiFetch<SettingPayload<T> | null>(`/settings/${key}`);
export const updateSetting = <T = unknown>(key: string, value: T) =>
  apiFetch<SettingPayload<T>>(`/settings/${key}`, { method: "PUT", body: jsonBody({ value }) });

export const settingsApi = {
  list: getSettings,
  get: getSetting,
  update: updateSetting,
  listTemplates: () => apiFetch<TemplatePayload[]>("/templates"),
  createTemplate: (payload: TemplatePayload) => apiFetch<TemplatePayload>("/templates", { method: "POST", body: jsonBody(payload) }),
  updateTemplate: (id: string, payload: TemplatePayload) => apiFetch<TemplatePayload>(`/templates/${id}`, { method: "PUT", body: jsonBody(payload) }),
  removeTemplate: (id: string) => apiFetch<{ deleted: boolean }>(`/templates/${id}`, { method: "DELETE" }),
};
