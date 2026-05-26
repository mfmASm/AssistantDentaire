import { apiFetch, jsonBody } from "@/services/api";

export type ApiPayment = {
  id: string;
  patient_id: string;
  treatment?: string | null;
  total_amount: number | string;
  paid_amount: number | string;
  remaining_amount?: number | string | null;
  status: string;
  due_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  patients?: {
    id: string;
    full_name?: string | null;
    phone?: string | null;
  } | null;
};

export type PaymentPayload = {
  patient_id?: string;
  treatment?: string | null;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  status?: string;
  due_date?: string | null;
  notes?: string | null;
};

export const paymentsApi = {
  getPayments: () => apiFetch<ApiPayment[]>("/payments"),
  createPayment: (payload: PaymentPayload) => apiFetch<ApiPayment>("/payments", { method: "POST", body: jsonBody(payload) }),
  updatePayment: (id: string, payload: PaymentPayload) =>
    apiFetch<ApiPayment>(`/payments/${id}`, { method: "PUT", body: jsonBody(payload) }),
  deletePayment: (id: string) => apiFetch<{ deleted: boolean }>(`/payments/${id}`, { method: "DELETE" }),

  list: () => paymentsApi.getPayments(),
  create: (payload: PaymentPayload) => paymentsApi.createPayment(payload),
  update: (id: string, payload: PaymentPayload) => paymentsApi.updatePayment(id, payload),
  remove: (id: string) => paymentsApi.deletePayment(id),
};
