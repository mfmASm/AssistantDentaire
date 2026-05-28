import { apiFetch, jsonBody } from "@/services/api";

export type ApiReviewStatus = "Non envoyé" | "Envoyé" | "Avis reçu";

export type ReviewPayload = {
  patient_id: string;
  appointment_id: string | null;
  status?: ApiReviewStatus | string;
};

export type ReviewUpdatePayload = {
  patient_id?: string;
  appointment_id?: string | null;
  status?: ApiReviewStatus | string;
  sent_at?: string | null;
  reviewed_at?: string | null;
};

export type ApiReviewRequest = ReviewPayload & {
  id: string;
  sent_at?: string;
  reviewed_at?: string;
  created_at?: string;
};

export const getReviews = () => apiFetch<ApiReviewRequest[]>("/reviews");

export const createReviewRequest = (payload: ReviewPayload) =>
  apiFetch<ApiReviewRequest>("/reviews", { method: "POST", body: jsonBody(payload) });

export const updateReviewRequest = (id: string, payload: ReviewUpdatePayload) =>
  apiFetch<ApiReviewRequest>(`/reviews/${id}`, { method: "PUT", body: jsonBody(payload) });

export const deleteReviewRequest = (id: string) =>
  apiFetch<{ deleted: boolean }>(`/reviews/${id}`, { method: "DELETE" });

export const markReviewSent = (id: string) =>
  apiFetch<ApiReviewRequest>(`/reviews/${id}/mark-sent`, { method: "POST", body: jsonBody({}) });

export const markReviewReceived = (id: string) =>
  apiFetch<ApiReviewRequest>(`/reviews/${id}/mark-reviewed`, { method: "POST", body: jsonBody({}) });

export const reviewsApi = {
  list: getReviews,
  create: createReviewRequest,
  update: updateReviewRequest,
  remove: deleteReviewRequest,
  getReviews,
  createReviewRequest,
  updateReviewRequest,
  deleteReviewRequest,
  markSent: markReviewSent,
  markReceived: markReviewReceived,
};
