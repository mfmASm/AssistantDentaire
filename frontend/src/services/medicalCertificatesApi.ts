import { apiFetch, jsonBody } from "@/services/api";
import { makeCrudApi } from "@/services/crudApi";

export type MedicalCertificatePayload = Record<string, unknown>;
const crud = makeCrudApi<MedicalCertificatePayload>("/medical-certificates");

export const medicalCertificatesApi = {
  ...crud,
  duplicate: (id: string) => apiFetch<MedicalCertificatePayload>(`/medical-certificates/${id}/duplicate`, { method: "POST", body: jsonBody({}) }),
  finalize: (id: string) => apiFetch<MedicalCertificatePayload>(`/medical-certificates/${id}/finalize`, { method: "POST", body: jsonBody({}) }),
  markSent: (id: string) => apiFetch<MedicalCertificatePayload>(`/medical-certificates/${id}/mark-sent`, { method: "POST", body: jsonBody({}) }),
  generatePdf: (id: string) => apiFetch<MedicalCertificatePayload>(`/medical-certificates/${id}/generate-pdf`, { method: "POST", body: jsonBody({}) }),
};
