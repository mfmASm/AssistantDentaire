import { apiFetch, jsonBody } from "@/services/api";

export type Cabinet = {
  id: string;
  name?: string | null;
  dentist_name?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  google_review_link?: string | null;
  logo_url?: string | null;
  created_at?: string | null;
};

export type CabinetUpdatePayload = Partial<Pick<
  Cabinet,
  "name" | "dentist_name" | "address" | "city" | "phone" | "whatsapp_number" | "google_review_link" | "logo_url"
>>;

export const getCurrentCabinet = () => apiFetch<Cabinet>("/cabinets/me");

export const updateCurrentCabinet = (payload: CabinetUpdatePayload) =>
  apiFetch<Cabinet>("/cabinets/me", { method: "PUT", body: jsonBody(payload) });

export const cabinetsApi = {
  getCurrent: getCurrentCabinet,
  updateCurrent: updateCurrentCabinet,
};
