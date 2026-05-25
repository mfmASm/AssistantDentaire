import { apiFetch, jsonBody, withApiFallback } from "@/services/api";
import { reviews } from "@/lib/demo-data";
import { makeCrudApi } from "@/services/crudApi";

export type ReviewPayload = Record<string, unknown>;
const crud = makeCrudApi<ReviewPayload>("/reviews");

export const reviewsApi = {
  ...crud,
  listWithFallback: () => withApiFallback(crud.list(), reviews as unknown as ReviewPayload[]),
  markSent: (id: string) => apiFetch<ReviewPayload>(`/reviews/${id}/mark-sent`, { method: "POST", body: jsonBody({}) }),
};
