import { apiFetch, jsonBody } from "@/services/api";

export type ApiPrescriptionStatus = "Brouillon" | "Finalisée" | "Envoyée" | "Imprimée";

export type PrescriptionItemPayload = {
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
};

export type ApiPrescriptionItem = PrescriptionItemPayload & {
  id: string;
  prescription_id: string;
  created_at?: string;
};

export type PrescriptionPayload = {
  patient_id: string;
  doctor_id?: string | null;
  reference?: string | null;
  prescription_date?: string | null;
  motif?: string | null;
  diagnosis_notes?: string | null;
  instructions?: string | null;
  status?: ApiPrescriptionStatus | string;
  items?: PrescriptionItemPayload[];
};

export type PrescriptionUpdatePayload = Partial<PrescriptionPayload>;

export type ApiPrescription = Omit<PrescriptionPayload, "items"> & {
  id: string;
  cabinet_id?: string;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: ApiPrescriptionItem[];
};

export const getPrescriptions = () => apiFetch<ApiPrescription[]>("/prescriptions");
export const getPrescription = (id: string) => apiFetch<ApiPrescription>(`/prescriptions/${id}`);
export const createPrescription = (payload: PrescriptionPayload) =>
  apiFetch<ApiPrescription>("/prescriptions", { method: "POST", body: jsonBody(payload) });
export const updatePrescription = (id: string, payload: PrescriptionUpdatePayload) =>
  apiFetch<ApiPrescription>(`/prescriptions/${id}`, { method: "PUT", body: jsonBody(payload) });
export const deletePrescription = (id: string) => apiFetch<{ deleted: boolean }>(`/prescriptions/${id}`, { method: "DELETE" });
export const duplicatePrescription = (id: string) =>
  apiFetch<ApiPrescription>(`/prescriptions/${id}/duplicate`, { method: "POST", body: jsonBody({}) });
export const markPrescriptionSent = (id: string) =>
  apiFetch<ApiPrescription>(`/prescriptions/${id}/mark-sent`, { method: "POST", body: jsonBody({}) });
export const generatePrescriptionPdf = (id: string) =>
  apiFetch<ApiPrescription>(`/prescriptions/${id}/generate-pdf`, { method: "POST", body: jsonBody({}) });
export const getPrescriptionPdfUrl = (id: string) =>
  apiFetch<{ url: string; expires_in: number }>(`/prescriptions/${id}/pdf-url`);
export const listPrescriptionItems = (id: string) => apiFetch<ApiPrescriptionItem[]>(`/prescriptions/${id}/items`);
export const createPrescriptionItem = (id: string, payload: PrescriptionItemPayload) =>
  apiFetch<ApiPrescriptionItem>(`/prescriptions/${id}/items`, { method: "POST", body: jsonBody(payload) });
export const updatePrescriptionItem = (id: string, itemId: string, payload: PrescriptionItemPayload) =>
  apiFetch<ApiPrescriptionItem>(`/prescriptions/${id}/items/${itemId}`, { method: "PUT", body: jsonBody(payload) });
export const deletePrescriptionItem = (id: string, itemId: string) =>
  apiFetch<{ deleted: boolean }>(`/prescriptions/${id}/items/${itemId}`, { method: "DELETE" });

export const prescriptionsApi = {
  list: getPrescriptions,
  get: getPrescription,
  create: createPrescription,
  update: updatePrescription,
  remove: deletePrescription,
  duplicate: duplicatePrescription,
  finalize: (id: string) => updatePrescription(id, { status: "Finalisée" }),
  markSent: markPrescriptionSent,
  generatePdf: generatePrescriptionPdf,
  getPdfUrl: getPrescriptionPdfUrl,
  listItems: listPrescriptionItems,
  createItem: createPrescriptionItem,
  updateItem: updatePrescriptionItem,
  removeItem: deletePrescriptionItem,
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  deletePrescription,
  duplicatePrescription,
  markPrescriptionSent,
  generatePrescriptionPdf,
  getPrescriptionPdfUrl,
};
