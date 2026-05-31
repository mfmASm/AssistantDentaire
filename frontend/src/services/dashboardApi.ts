import { apiFetch, withApiFallback } from "@/services/api";

export type DashboardPatient = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type DashboardAppointment = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  appointment_date?: string | null;
  start_time?: string | null;
  treatment_type?: string | null;
  status?: string | null;
  payment_status?: string | null;
  follow_up_status?: string | null;
};

export type DashboardPayment = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  treatment?: string | null;
  remaining_amount?: number | null;
  due_date?: string | null;
  status?: string | null;
};

export type DashboardRecall = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  phone?: string | null;
  recall_type?: string | null;
  next_recall_date?: string | null;
  status?: string | null;
};

export type DashboardActivity = {
  type: string;
  title: string;
  description: string;
  created_at: string;
};

export type DashboardSummary = {
  appointments_today_count: number;
  appointments_today_completed_count?: number;
  appointments_today_upcoming_count?: number;
  upcoming_appointments_count: number;
  patients_total: number;
  new_patients_this_month: number;
  payments_collected_today: number;
  payments_collected_month: number;
  unpaid_balances_total: number;
  overdue_payments_count: number;
  recalls_due_count: number;
  review_requests_pending: number;
  review_requests_sent: number;
  prescriptions_today_count: number;
  certificates_today_count: number;
  recent_patients: DashboardPatient[];
  appointments_today?: DashboardAppointment[];
  upcoming_appointments: DashboardAppointment[];
  overdue_payments: DashboardPayment[];
  due_recalls: DashboardRecall[];
  recent_activity: DashboardActivity[];
};

const fallback: DashboardSummary = {
  appointments_today_count: 0,
  appointments_today_completed_count: 0,
  appointments_today_upcoming_count: 0,
  upcoming_appointments_count: 0,
  patients_total: 0,
  new_patients_this_month: 0,
  payments_collected_today: 0,
  payments_collected_month: 0,
  unpaid_balances_total: 0,
  overdue_payments_count: 0,
  recalls_due_count: 0,
  review_requests_pending: 0,
  review_requests_sent: 0,
  prescriptions_today_count: 0,
  certificates_today_count: 0,
  recent_patients: [],
  appointments_today: [],
  upcoming_appointments: [],
  overdue_payments: [],
  due_recalls: [],
  recent_activity: [],
};

export const getDashboardSummary = () => apiFetch<DashboardSummary>("/dashboard/summary");

export const dashboardApi = {
  summary: getDashboardSummary,
  summaryWithFallback: () => withApiFallback(getDashboardSummary(), fallback),
};
