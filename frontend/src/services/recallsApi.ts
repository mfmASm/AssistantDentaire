import { apiFetch, jsonBody } from "@/services/api";

export type ApiRecallStatus = "Planifié" | "Bientôt" | "En retard" | "Terminé";

export type RecallPayload = {
  patient_id: string;
  recall_type?: string;
  last_visit_date?: string;
  next_recall_date: string;
  status?: ApiRecallStatus | string;
  notes?: string;
};

export type ApiRecall = RecallPayload & {
  id: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
};

export const getRecalls = () => apiFetch<ApiRecall[]>("/recalls");

export const createRecall = (payload: RecallPayload) =>
  apiFetch<ApiRecall>("/recalls", { method: "POST", body: jsonBody(payload) });

export const updateRecall = (id: string, payload: RecallPayload) =>
  apiFetch<ApiRecall>(`/recalls/${id}`, { method: "PUT", body: jsonBody(payload) });

export const deleteRecall = (id: string) => apiFetch<{ deleted: boolean }>(`/recalls/${id}`, { method: "DELETE" });

export const recallsApi = {
  list: getRecalls,
  create: createRecall,
  update: updateRecall,
  remove: deleteRecall,
  getRecalls,
  createRecall,
  updateRecall,
  deleteRecall,
};
