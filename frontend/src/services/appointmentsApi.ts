import { apiFetch, jsonBody } from "@/services/api";

export type ApiAppointment = {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  appointment_date: string;
  start_time: string;
  end_time?: string | null;
  treatment_type?: string | null;
  status: string;
  payment_status?: string | null;
  notes?: string | null;
  follow_up_status?: string | null;
  follow_up_note?: string | null;
  follow_up_updated_at?: string | null;
  created_at?: string;
  patients?: {
    id: string;
    full_name?: string | null;
    phone?: string | null;
  } | null;
};

export type AppointmentPayload = {
  patient_id?: string;
  doctor_id?: string | null;
  appointment_date?: string;
  start_time?: string;
  end_time?: string | null;
  treatment_type?: string | null;
  status?: string;
  payment_status?: string | null;
  notes?: string | null;
  follow_up_status?: string | null;
  follow_up_note?: string | null;
  follow_up_updated_at?: string | null;
};

export const appointmentsApi = {
  getAppointments: () => apiFetch<ApiAppointment[]>("/appointments"),
  createAppointment: (payload: AppointmentPayload) =>
    apiFetch<ApiAppointment>("/appointments", { method: "POST", body: jsonBody(payload) }),
  updateAppointment: (id: string, payload: AppointmentPayload) =>
    apiFetch<ApiAppointment>(`/appointments/${id}`, { method: "PUT", body: jsonBody(payload) }),
  deleteAppointment: (id: string) => apiFetch<{ deleted: boolean }>(`/appointments/${id}`, { method: "DELETE" }),

  list: () => appointmentsApi.getAppointments(),
  create: (payload: AppointmentPayload) => appointmentsApi.createAppointment(payload),
  update: (id: string, payload: AppointmentPayload) => appointmentsApi.updateAppointment(id, payload),
  remove: (id: string) => appointmentsApi.deleteAppointment(id),
};
