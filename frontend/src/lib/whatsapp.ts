import { toast } from "sonner";

import { isDemoMode } from "@/lib/demoMode";
import { createWhatsappLog } from "@/services/whatsappLogsApi";

type TemplateParams = Record<string, string | number | undefined>;
type CabinetTemplateContext = {
  name?: string | null;
  googleReviewLink?: string | null;
};

const CABINET_TEMPLATE_CONTEXT_KEY = "assistantdentaire-whatsapp-cabinet-context";

export const whatsappTemplates = {
  appointment:
    "Bonjour [Patient], nous vous rappelons votre rendez-vous au [Cabinet] prevu le [Date] a [Heure]. Merci de confirmer votre presence. A bientot.",
  payment:
    "Bonjour [Patient], nous vous rappelons qu'un solde de [Montant] MAD reste a regler pour votre traitement: [Traitement]. Merci de nous contacter si besoin. [Cabinet].",
  review:
    "Bonjour [Patient], merci pour votre visite au [Cabinet]. Votre avis nous aide beaucoup. Vous pouvez laisser un avis ici: [Google Review Link]. Merci beaucoup.",
  recall:
    "Bonjour [Patient], votre rappel de suivi dentaire est prevu pour [Type de rappel]. Nous vous invitons a contacter le cabinet pour planifier votre visite. [Cabinet].",
  prescription:
    "Bonjour [Patient], votre ordonnance est prete. Le message WhatsApp est prepare, veuillez joindre le PDF telecharge avant l'envoi. [Cabinet].",
  certificate:
    "Bonjour [Patient], votre certificat medical est pret. Le message WhatsApp est prepare, veuillez joindre le PDF telecharge avant l'envoi. [Cabinet].",
};

export const setWhatsAppCabinetContext = (context: CabinetTemplateContext | null | undefined) => {
  if (typeof window === "undefined") return;

  if (!context) {
    window.localStorage.removeItem(CABINET_TEMPLATE_CONTEXT_KEY);
    return;
  }

  window.localStorage.setItem(CABINET_TEMPLATE_CONTEXT_KEY, JSON.stringify(context));
};

export const getWhatsAppCabinetContext = (): CabinetTemplateContext => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(CABINET_TEMPLATE_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const defaultTemplateParams = (): TemplateParams => {
  const context = getWhatsAppCabinetContext();
  return {
    Cabinet: context.name?.trim() || "votre cabinet dentaire",
    "Google Review Link": context.googleReviewLink?.trim() || "",
  };
};

export const fillWhatsAppTemplate = (template: string, params: TemplateParams) =>
  Object.entries({ ...defaultTemplateParams(), ...params }).reduce(
    (message, [key, value]) => message.replaceAll(`[${key}]`, String(value ?? "")),
    template,
  );

export const formatMoroccanWhatsAppNumber = (phone?: string) => {
  const cleaned = (phone ?? "").replace(/[\s\-()+.]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("212")) return cleaned;
  if (cleaned.startsWith("0")) return `212${cleaned.slice(1)}`;
  if (cleaned.startsWith("6") || cleaned.startsWith("7")) return `212${cleaned}`;
  return cleaned;
};

export const normalizeMoroccanPhone = formatMoroccanWhatsAppNumber;

export const buildWhatsappUrl = (phone?: string, message?: string) => {
  const formattedPhone = normalizeMoroccanPhone(phone);
  const text = (message ?? "").trim();
  if (!formattedPhone || !text) return "";
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
};

export const openWhatsAppMessage = (phone?: string, message?: string) => {
  const formattedPhone = normalizeMoroccanPhone(phone);
  const text = (message ?? "").trim();

  if (!formattedPhone) {
    toast.error("Numero WhatsApp du patient manquant.");
    return false;
  }

  if (!text) {
    toast.error("Message WhatsApp vide.");
    return false;
  }

  window.open(buildWhatsappUrl(formattedPhone, text), "_blank", "noopener,noreferrer");
  toast.success("Message WhatsApp prepare.");
  return true;
};

export const openWhatsapp = openWhatsAppMessage;

type LogAndOpenWhatsappPayload = {
  patientId?: string | null;
  type: string;
  phone?: string | null;
  message?: string | null;
};

export const logAndOpenWhatsapp = ({ patientId, type, phone, message }: LogAndOpenWhatsappPayload) => {
  const opened = openWhatsAppMessage(phone ?? undefined, message ?? undefined);
  if (!opened) return false;

  if (!isDemoMode()) {
    createWhatsappLog({
      patient_id: patientId ?? null,
      type,
      message: message ?? "",
      phone: phone ?? "",
      status: "Ouvert WhatsApp",
    }).catch(() => console.warn("WhatsApp log failed"));
  }

  return true;
};
