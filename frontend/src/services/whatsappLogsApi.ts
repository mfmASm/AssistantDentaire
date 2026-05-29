import { apiFetch, jsonBody } from "@/services/api";

export type WhatsappLogPayload = {
  patient_id?: string | null;
  type?: string | null;
  message: string;
  phone: string;
  status?: "Préparé" | "Ouvert WhatsApp" | "Envoyé manuellement" | string;
};

export type WhatsappLog = WhatsappLogPayload & {
  id: string;
  cabinet_id: string;
  sent_by?: string | null;
  sent_at?: string | null;
};

export const getWhatsappLogs = () => apiFetch<WhatsappLog[]>("/whatsapp-logs");

export const createWhatsappLog = (payload: WhatsappLogPayload) =>
  apiFetch<{ wa_me_url: string; attachment_reminder?: string; log: WhatsappLog }>("/whatsapp-logs", {
    method: "POST",
    body: jsonBody(payload),
  });

export const whatsappLogsApi = {
  list: getWhatsappLogs,
  create: createWhatsappLog,
};
