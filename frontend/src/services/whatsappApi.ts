import { apiFetch, jsonBody } from "@/services/api";

export type WhatsAppPayload = {
  patient_id?: string;
  type?: string;
  message: string;
  phone: string;
  status?: string;
};

export const whatsappApi = {
  list: () => apiFetch<WhatsAppPayload[]>("/whatsapp-logs"),
  create: (payload: WhatsAppPayload) => apiFetch<{ wa_me_url: string; attachment_reminder?: string; log: unknown }>("/whatsapp-logs", { method: "POST", body: jsonBody(payload) }),
};
