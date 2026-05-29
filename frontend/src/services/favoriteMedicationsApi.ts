import { apiFetch, jsonBody } from "@/services/api";

export type FavoriteMedicationPayload = {
  name: string;
  category?: string | null;
  default_dosage?: string | null;
  default_frequency?: string | null;
  default_duration?: string | null;
  default_instructions?: string | null;
  internal_notes?: string | null;
};

export type ApiFavoriteMedication = FavoriteMedicationPayload & {
  id: string;
  created_at?: string;
  updated_at?: string;
};

export const getFavoriteMedications = () => apiFetch<ApiFavoriteMedication[]>("/favorite-medications");
export const createFavoriteMedication = (payload: FavoriteMedicationPayload) =>
  apiFetch<ApiFavoriteMedication>("/favorite-medications", { method: "POST", body: jsonBody(payload) });
export const updateFavoriteMedication = (id: string, payload: FavoriteMedicationPayload) =>
  apiFetch<ApiFavoriteMedication>(`/favorite-medications/${id}`, { method: "PUT", body: jsonBody(payload) });
export const deleteFavoriteMedication = (id: string) =>
  apiFetch<{ deleted: boolean }>(`/favorite-medications/${id}`, { method: "DELETE" });

export const favoriteMedicationsApi = {
  list: getFavoriteMedications,
  create: createFavoriteMedication,
  update: updateFavoriteMedication,
  remove: deleteFavoriteMedication,
  getFavoriteMedications,
  createFavoriteMedication,
  updateFavoriteMedication,
  deleteFavoriteMedication,
};
