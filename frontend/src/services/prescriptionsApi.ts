import { apiFetch, jsonBody } from "@/services/api";
import { makeCrudApi } from "@/services/crudApi";

export type PrescriptionPayload = Record<string, unknown>;
export type PrescriptionItemPayload = Record<string, unknown>;
const crud = makeCrudApi<PrescriptionPayload>("/prescriptions");

export const prescriptionsApi = {
  ...crud,
  duplicate: (id: string) => apiFetch<PrescriptionPayload>(`/prescriptions/${id}/duplicate`, { method: "POST", body: jsonBody({}) }),
  finalize: (id: string) => apiFetch<PrescriptionPayload>(`/prescriptions/${id}/finalize`, { method: "POST", body: jsonBody({}) }),
  markSent: (id: string) => apiFetch<PrescriptionPayload>(`/prescriptions/${id}/mark-sent`, { method: "POST", body: jsonBody({}) }),
  generatePdf: (id: string) => apiFetch<PrescriptionPayload>(`/prescriptions/${id}/generate-pdf`, { method: "POST", body: jsonBody({}) }),
  listItems: (id: string) => apiFetch<PrescriptionItemPayload[]>(`/prescriptions/${id}/items`),
  createItem: (id: string, payload: PrescriptionItemPayload) => apiFetch<PrescriptionItemPayload>(`/prescriptions/${id}/items`, { method: "POST", body: jsonBody(payload) }),
  updateItem: (id: string, itemId: string, payload: PrescriptionItemPayload) => apiFetch<PrescriptionItemPayload>(`/prescriptions/${id}/items/${itemId}`, { method: "PUT", body: jsonBody(payload) }),
  removeItem: (id: string, itemId: string) => apiFetch<{ deleted: boolean }>(`/prescriptions/${id}/items/${itemId}`, { method: "DELETE" }),
};
