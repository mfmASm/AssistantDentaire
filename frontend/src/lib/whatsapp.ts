import { toast } from "sonner";

type TemplateParams = Record<string, string | number | undefined>;

export const whatsappTemplates = {
  appointment:
    "Bonjour [Patient], nous vous rappelons votre rendez-vous au Cabinet Atlas — Casablanca prévu le [Date] à [Heure]. Merci de confirmer votre présence. À bientôt.",
  payment:
    "Bonjour [Patient], nous vous rappelons qu’un solde de [Montant] MAD reste à régler pour votre traitement: [Traitement]. Merci de nous contacter si besoin. Cabinet Atlas — Casablanca.",
  review:
    "Bonjour [Patient], merci pour votre visite au Cabinet Atlas — Casablanca. Votre avis nous aide beaucoup. Vous pouvez laisser un avis ici: [Google Review Link]. Merci beaucoup.",
  recall:
    "Bonjour [Patient], votre rappel de suivi dentaire est prévu pour [Type de rappel]. Nous vous invitons à contacter le cabinet pour planifier votre visite. Cabinet Atlas — Casablanca.",
  prescription:
    "Bonjour [Patient], votre ordonnance est prête. Le message WhatsApp est préparé, veuillez joindre le PDF téléchargé avant l’envoi. Cabinet Atlas — Casablanca.",
  certificate:
    "Bonjour [Patient], votre certificat médical est prêt. Le message WhatsApp est préparé, veuillez joindre le PDF téléchargé avant l’envoi. Cabinet Atlas — Casablanca.",
};

export const fillWhatsAppTemplate = (template: string, params: TemplateParams) =>
  Object.entries(params).reduce(
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

export const openWhatsAppMessage = (phone?: string, message?: string) => {
  const formattedPhone = formatMoroccanWhatsAppNumber(phone);
  const text = (message ?? "").trim();

  if (!formattedPhone) {
    toast.error("Numéro WhatsApp du patient manquant.");
    return false;
  }

  if (!text) {
    toast.error("Message WhatsApp vide.");
    return false;
  }

  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  toast.success("Message WhatsApp préparé avec succès.");
  return true;
};

