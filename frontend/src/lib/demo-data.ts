// Realistic Moroccan dental cabinet demo data (FR)
import { relativeISO } from "@/lib/date-utils";

export type PaymentStatus = "paid" | "partial" | "unpaid";
export type RecallStatus = "scheduled" | "due_soon" | "overdue" | "completed" | "sent";
export type ReviewStatus = "not_sent" | "sent" | "reviewed";
export type AppointmentStatus = "confirmed" | "waiting" | "completed" | "cancelled" | "no_show";
export type PatientStatus = "active" | "follow_up" | "payment_pending" | "recall_due";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: PatientStatus;
  lastVisit: string;
  notes?: string;
}

export interface Payment {
  id: string;
  patientId: string;
  patient: string;
  treatment: string;
  total: number;
  paid: number;
  dueDate: string;
  status: PaymentStatus;
  installments?: number;
  notes?: string;
}

export interface Recall {
  id: string;
  patientId: string;
  patient: string;
  phone: string;
  type: string;
  lastVisit: string;
  nextRecall: string;
  status: RecallStatus;
  completedAt?: string;
}

export interface ReviewRequest {
  id: string;
  patientId: string;
  patient: string;
  phone: string;
  visitDate: string;
  status: ReviewStatus;
  sentAt?: string;
}

export interface Appointment {
  id: string;
  time: string;
  patientId: string;
  patient: string;
  treatment: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  followUp: boolean;
}

export const patients: Patient[] = [
  { id: "p1", name: "Yasmine El Amrani", phone: "+212 661 23 45 67", email: "yasmine.elamrani@gmail.com", status: "payment_pending", lastVisit: relativeISO(-6), notes: "Allergie pénicilline" },
  { id: "p2", name: "Omar Benjelloun", phone: "+212 670 88 21 04", email: "omar.benjelloun@outlook.com", status: "active", lastVisit: relativeISO(-3) },
  { id: "p3", name: "Salma Tazi", phone: "+212 662 19 77 30", email: "salma.tazi@gmail.com", status: "recall_due", lastVisit: relativeISO(-183) },
  { id: "p4", name: "Karim Bennani", phone: "+212 665 44 12 90", email: "karim.bennani@gmail.com", status: "follow_up", lastVisit: relativeISO(-8), notes: "Implant secteur 2" },
  { id: "p5", name: "Nadia Chraibi", phone: "+212 668 90 33 21", email: "nadia.chraibi@yahoo.fr", status: "payment_pending", lastVisit: relativeISO(-20) },
  { id: "p6", name: "Mehdi Lahlou", phone: "+212 663 71 56 12", email: "mehdi.lahlou@gmail.com", status: "active", lastVisit: relativeISO(-2) },
  { id: "p7", name: "Imane Berrada", phone: "+212 661 02 88 47", email: "imane.berrada@gmail.com", status: "recall_due", lastVisit: relativeISO(-197) },
  { id: "p8", name: "Youssef Alaoui", phone: "+212 666 33 21 09", email: "y.alaoui@gmail.com", status: "active", lastVisit: relativeISO(-4) },
  { id: "p9", name: "Lina Sefrioui", phone: "+212 669 12 45 78", email: "lina.sefrioui@gmail.com", status: "follow_up", lastVisit: relativeISO(-10), notes: "Orthodontie en cours" },
  { id: "p10", name: "Anas Filali", phone: "+212 664 78 90 12", email: "anas.filali@gmail.com", status: "payment_pending", lastVisit: relativeISO(-16) },
];

export const payments: Payment[] = [
  { id: "pay1", patientId: "p1", patient: "Yasmine El Amrani", treatment: "Couronne céramique (x2)", total: 6000, paid: 2000, dueDate: relativeISO(7), status: "partial", installments: 3, notes: "Paiement en 3 fois" },
  { id: "pay2", patientId: "p4", patient: "Karim Bennani", treatment: "Implant dentaire", total: 8500, paid: 8500, dueDate: relativeISO(-8), status: "paid" },
  { id: "pay3", patientId: "p5", patient: "Nadia Chraibi", treatment: "Traitement de canal", total: 2200, paid: 0, dueDate: relativeISO(-3), status: "unpaid" },
  { id: "pay4", patientId: "p10", patient: "Anas Filali", treatment: "Détartrage + blanchiment", total: 1800, paid: 800, dueDate: relativeISO(2), status: "partial", installments: 2 },
  { id: "pay5", patientId: "p2", patient: "Omar Benjelloun", treatment: "Extraction dent de sagesse", total: 1500, paid: 1500, dueDate: relativeISO(-3), status: "paid" },
  { id: "pay6", patientId: "p9", patient: "Lina Sefrioui", treatment: "Orthodontie (mensualité)", total: 1200, paid: 1200, dueDate: relativeISO(0), status: "paid" },
  { id: "pay7", patientId: "p6", patient: "Mehdi Lahlou", treatment: "Consultation + radio", total: 400, paid: 400, dueDate: relativeISO(-2), status: "paid" },
  { id: "pay8", patientId: "p3", patient: "Salma Tazi", treatment: "Composite (x3)", total: 2100, paid: 0, dueDate: relativeISO(-18), status: "unpaid" },
];

export const recalls: Recall[] = [
  { id: "r1", patientId: "p3", patient: "Salma Tazi", phone: "+212 662 19 77 30", type: "Détartrage", lastVisit: relativeISO(-183), nextRecall: relativeISO(0), status: "due_soon" },
  { id: "r2", patientId: "p7", patient: "Imane Berrada", phone: "+212 661 02 88 47", type: "Contrôle annuel", lastVisit: relativeISO(-197), nextRecall: relativeISO(-14), status: "overdue" },
  { id: "r3", patientId: "p9", patient: "Lina Sefrioui", phone: "+212 669 12 45 78", type: "Contrôle orthodontie", lastVisit: relativeISO(-40), nextRecall: relativeISO(4), status: "scheduled" },
  { id: "r4", patientId: "p4", patient: "Karim Bennani", phone: "+212 665 44 12 90", type: "Suivi implant", lastVisit: relativeISO(-8), nextRecall: relativeISO(23), status: "scheduled" },
  { id: "r5", patientId: "p2", patient: "Omar Benjelloun", phone: "+212 670 88 21 04", type: "Contrôle post-extraction", lastVisit: relativeISO(-3), nextRecall: relativeISO(4), status: "due_soon" },
  { id: "r6", patientId: "p8", patient: "Youssef Alaoui", phone: "+212 666 33 21 09", type: "Détartrage", lastVisit: relativeISO(-187), nextRecall: relativeISO(-4), status: "overdue" },
  { id: "r7", patientId: "p6", patient: "Mehdi Lahlou", phone: "+212 663 71 56 12", type: "Contrôle enfant", lastVisit: relativeISO(-2), nextRecall: relativeISO(182), status: "scheduled" },
];

export const reviews: ReviewRequest[] = [
  { id: "rv1", patientId: "p2", patient: "Omar Benjelloun", phone: "+212 670 88 21 04", visitDate: relativeISO(-3), status: "reviewed", sentAt: relativeISO(-3) },
  { id: "rv2", patientId: "p4", patient: "Karim Bennani", phone: "+212 665 44 12 90", visitDate: relativeISO(-8), status: "sent", sentAt: relativeISO(-8) },
  { id: "rv3", patientId: "p6", patient: "Mehdi Lahlou", phone: "+212 663 71 56 12", visitDate: relativeISO(-2), status: "not_sent" },
  { id: "rv4", patientId: "p8", patient: "Youssef Alaoui", phone: "+212 666 33 21 09", visitDate: relativeISO(-4), status: "reviewed", sentAt: relativeISO(-4) },
  { id: "rv5", patientId: "p9", patient: "Lina Sefrioui", phone: "+212 669 12 45 78", visitDate: relativeISO(-10), status: "sent", sentAt: relativeISO(-10) },
  { id: "rv6", patientId: "p1", patient: "Yasmine El Amrani", phone: "+212 661 23 45 67", visitDate: relativeISO(-6), status: "not_sent" },
];

export const appointments: Appointment[] = [
  { id: "a1", time: "09:00", patientId: "p2", patient: "Omar Benjelloun", treatment: "Contrôle post-extraction", status: "completed", paymentStatus: "paid", followUp: false },
  { id: "a2", time: "09:45", patientId: "p6", patient: "Mehdi Lahlou", treatment: "Consultation enfant", status: "completed", paymentStatus: "paid", followUp: false },
  { id: "a3", time: "10:30", patientId: "p1", patient: "Yasmine El Amrani", treatment: "Pose couronne céramique", status: "waiting", paymentStatus: "partial", followUp: true },
  { id: "a4", time: "11:30", patientId: "p4", patient: "Karim Bennani", treatment: "Suivi implant secteur 2", status: "confirmed", paymentStatus: "paid", followUp: false },
  { id: "a5", time: "14:00", patientId: "p5", patient: "Nadia Chraibi", treatment: "Traitement de canal (séance 2)", status: "confirmed", paymentStatus: "unpaid", followUp: true },
  { id: "a6", time: "15:00", patientId: "p9", patient: "Lina Sefrioui", treatment: "Ajustement orthodontie", status: "confirmed", paymentStatus: "paid", followUp: false },
  { id: "a7", time: "16:00", patientId: "p10", patient: "Anas Filali", treatment: "Blanchiment dentaire", status: "confirmed", paymentStatus: "partial", followUp: false },
  { id: "a8", time: "17:00", patientId: "p7", patient: "Imane Berrada", treatment: "Détartrage", status: "no_show", paymentStatus: "unpaid", followUp: true },
];

export const newLeads = [
  { id: "l1", name: "Hicham Doukkali", phone: "+212 661 90 12 33", source: "Instagram", date: relativeISO(-1) },
  { id: "l2", name: "Sara Idrissi", phone: "+212 662 45 78 11", source: "Google", date: relativeISO(-1) },
  { id: "l3", name: "Rachid Naciri", phone: "+212 663 22 56 78", source: "Recommandation", date: relativeISO(-2) },
];

export const formatMAD = (n: number) =>
  new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
