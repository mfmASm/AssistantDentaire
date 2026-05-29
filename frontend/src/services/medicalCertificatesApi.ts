import { apiFetch, jsonBody } from "@/services/api";

export type ApiMedicalCertificateStatus = "Brouillon" | "Finalisé" | "Envoyé" | "Imprimé";

export type MedicalCertificatePayload = {
  patient_id: string;
  certificate_date?: string | null;
  certificate_type?: string | null;
  motif?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  rest_duration?: string | null;
  observations?: string | null;
  internal_notes?: string | null;
  certificate_text?: string | null;
  status?: ApiMedicalCertificateStatus | string;
};

export type MedicalCertificateUpdatePayload = Partial<MedicalCertificatePayload>;

export type ApiMedicalCertificate = MedicalCertificatePayload & {
  id: string;
  cabinet_id?: string;
  doctor_id?: string | null;
  reference?: string | null;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const getMedicalCertificates = () => apiFetch<ApiMedicalCertificate[]>("/medical-certificates");
export const getMedicalCertificate = (id: string) => apiFetch<ApiMedicalCertificate>(`/medical-certificates/${id}`);
export const createMedicalCertificate = (payload: MedicalCertificatePayload) =>
  apiFetch<ApiMedicalCertificate>("/medical-certificates", { method: "POST", body: jsonBody(payload) });
export const updateMedicalCertificate = (id: string, payload: MedicalCertificateUpdatePayload) =>
  apiFetch<ApiMedicalCertificate>(`/medical-certificates/${id}`, { method: "PUT", body: jsonBody(payload) });
export const deleteMedicalCertificate = (id: string) =>
  apiFetch<{ deleted: boolean }>(`/medical-certificates/${id}`, { method: "DELETE" });
export const duplicateMedicalCertificate = (id: string) =>
  apiFetch<ApiMedicalCertificate>(`/medical-certificates/${id}/duplicate`, { method: "POST", body: jsonBody({}) });
export const markMedicalCertificateSent = (id: string) =>
  apiFetch<ApiMedicalCertificate>(`/medical-certificates/${id}/mark-sent`, { method: "POST", body: jsonBody({}) });
export const generateMedicalCertificatePdf = (id: string) =>
  apiFetch<ApiMedicalCertificate>(`/medical-certificates/${id}/generate-pdf`, { method: "POST", body: jsonBody({}) });

export const medicalCertificatesApi = {
  list: getMedicalCertificates,
  get: getMedicalCertificate,
  create: createMedicalCertificate,
  update: updateMedicalCertificate,
  remove: deleteMedicalCertificate,
  duplicate: duplicateMedicalCertificate,
  markSent: markMedicalCertificateSent,
  generatePdf: generateMedicalCertificatePdf,
  getMedicalCertificates,
  getMedicalCertificate,
  createMedicalCertificate,
  updateMedicalCertificate,
  deleteMedicalCertificate,
  duplicateMedicalCertificate,
  markMedicalCertificateSent,
  generateMedicalCertificatePdf,
};
