import { apiFetch, withApiFallback } from "@/services/api";

export type DashboardSummary = {
  appointments_today_count: number;
  unpaid_balances_total: number;
  payments_collected_today: number;
  recalls_due_count: number;
  review_requests_pending: number;
  prescriptions_today_count: number;
  certificates_today_count: number;
  recent_patients: unknown[];
  upcoming_appointments: unknown[];
  overdue_payments: unknown[];
  due_recalls: unknown[];
};

const fallback: DashboardSummary = {
  appointments_today_count: 0,
  unpaid_balances_total: 0,
  payments_collected_today: 0,
  recalls_due_count: 0,
  review_requests_pending: 0,
  prescriptions_today_count: 0,
  certificates_today_count: 0,
  recent_patients: [],
  upcoming_appointments: [],
  overdue_payments: [],
  due_recalls: [],
};

export const dashboardApi = {
  summary: () => apiFetch<DashboardSummary>("/dashboard/summary"),
  summaryWithFallback: () => withApiFallback(apiFetch<DashboardSummary>("/dashboard/summary"), fallback),
};
