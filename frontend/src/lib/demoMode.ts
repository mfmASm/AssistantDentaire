import { todayISO } from "@/lib/date-utils";
import type { ApiAppointment } from "@/services/appointmentsApi";
import type { ApiPatient } from "@/services/patientsApi";
import type { ApiPayment } from "@/services/paymentsApi";

// Frontend-only demo data. Do not save to backend. Do not use for real client accounts.

export const DEMO_MODE_STORAGE_KEY = "dentaflow_demo_mode";
export const DEMO_MODE_EVENT = "dentaflow-demo-mode-change";

export function getDemoModeFromStorage() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true";
}

export function isDemoMode() {
  return getDemoModeFromStorage();
}

export function setDemoMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(DEMO_MODE_EVENT, { detail: { enabled } }));
}

export function toggleDemoMode() {
  const next = !getDemoModeFromStorage();
  setDemoMode(next);
  return next;
}

const iso = (offset: number) => {
  const date = new Date(`${todayISO()}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const demoCabinet = {
  name: "Cabinet Démo — Casablanca",
  dentist: "Dr. Safaa M’gassy",
  role: "Chirurgienne-dentiste",
  city: "Casablanca",
};

export const demoPatients: ApiPatient[] = [
  { id: "11111111-1111-4111-8111-111111111111", full_name: "Yasmine El Amrani", phone: "+212 661 23 45 67", email: "yasmine.demo@example.com", age: 34, gender: "F", address: "Maarif, Casablanca", status: "payment_pending", notes: "Allergie pénicilline", created_at: iso(-120), updated_at: iso(-6) },
  { id: "22222222-2222-4222-8222-222222222222", full_name: "Karim Bennani", phone: "+212 665 44 12 90", email: "karim.demo@example.com", age: 51, gender: "M", address: "Anfa, Casablanca", status: "follow_up", notes: "Implant secteur 2", created_at: iso(-95), updated_at: iso(-8) },
  { id: "33333333-3333-4333-8333-333333333333", full_name: "Nadia Chraibi", phone: "+212 668 90 33 21", email: "nadia.demo@example.com", age: 46, gender: "F", address: "Gauthier, Casablanca", status: "payment_pending", notes: "Plan de paiement", created_at: iso(-80), updated_at: iso(-20) },
  { id: "44444444-4444-4444-8444-444444444444", full_name: "Omar Benjelloun", phone: "+212 670 88 21 04", email: "omar.demo@example.com", age: 42, gender: "M", address: "Racine, Casablanca", status: "active", notes: "Contrôle post-extraction", created_at: iso(-76), updated_at: iso(-3) },
  { id: "55555555-5555-4555-8555-555555555555", full_name: "Salma Tazi", phone: "+212 662 19 77 30", email: "salma.demo@example.com", age: 29, gender: "F", address: "Bourgogne, Casablanca", status: "recall_due", notes: "Détartrage semestriel", created_at: iso(-70), updated_at: iso(-183) },
  { id: "66666666-6666-4666-8666-666666666666", full_name: "Mehdi Lahlou", phone: "+212 663 71 56 12", email: "mehdi.demo@example.com", age: 38, gender: "M", address: "Oasis, Casablanca", status: "active", notes: "Consultation enfant", created_at: iso(-52), updated_at: iso(-2) },
  { id: "77777777-7777-4777-8777-777777777777", full_name: "Imane El Fassi", phone: "+212 661 02 88 47", email: "imane.demo@example.com", age: 31, gender: "F", address: "Palmier, Casablanca", status: "recall_due", notes: "Rappel annuel", created_at: iso(-45), updated_at: iso(-197) },
  { id: "88888888-8888-4888-8888-888888888888", full_name: "Amine Berrada", phone: "+212 666 33 21 09", email: "amine.demo@example.com", age: 27, gender: "M", address: "Californie, Casablanca", status: "active", notes: "Blanchiment demandé", created_at: iso(-30), updated_at: iso(-4) },
  { id: "99999999-9999-4999-8999-999999999999", full_name: "Lina Alaoui", phone: "+212 669 12 45 78", email: "lina.demo@example.com", age: 24, gender: "F", address: "2 Mars, Casablanca", status: "follow_up", notes: "Orthodontie en cours", created_at: iso(-24), updated_at: iso(-10) },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", full_name: "Soufiane Ait Taleb", phone: "+212 664 78 90 12", email: "soufiane.demo@example.com", age: 36, gender: "M", address: "Sidi Maarouf, Casablanca", status: "payment_pending", notes: "Couronne à terminer", created_at: iso(-16), updated_at: iso(-1) },
];

export const demoAppointments: ApiAppointment[] = [
  { id: "da1", patient_id: demoPatients[3].id, appointment_date: iso(0), start_time: "09:00", end_time: "09:30", treatment_type: "Extraction dentaire", status: "Terminé", payment_status: "Payé", notes: "Contrôle post-extraction", follow_up_status: "Aucun suivi", patients: { id: demoPatients[3].id, full_name: demoPatients[3].full_name, phone: demoPatients[3].phone } },
  { id: "da2", patient_id: demoPatients[5].id, appointment_date: iso(0), start_time: "09:45", end_time: "10:15", treatment_type: "Consultation enfant", status: "Terminé", payment_status: "Payé", notes: "", follow_up_status: "Aucun suivi", patients: { id: demoPatients[5].id, full_name: demoPatients[5].full_name, phone: demoPatients[5].phone } },
  { id: "da3", patient_id: demoPatients[0].id, appointment_date: iso(0), start_time: "10:30", end_time: "11:15", treatment_type: "Couronne céramique", status: "En attente", payment_status: "Partiel", notes: "Essayage teinte", follow_up_status: "À recontacter", follow_up_note: "Confirmer disponibilité demain", patients: { id: demoPatients[0].id, full_name: demoPatients[0].full_name, phone: demoPatients[0].phone } },
  { id: "da4", patient_id: demoPatients[1].id, appointment_date: iso(0), start_time: "11:30", end_time: "12:00", treatment_type: "Consultation implant", status: "Confirmé", payment_status: "Payé", notes: "", follow_up_status: "Aucun suivi", patients: { id: demoPatients[1].id, full_name: demoPatients[1].full_name, phone: demoPatients[1].phone } },
  { id: "da5", patient_id: demoPatients[2].id, appointment_date: iso(0), start_time: "14:00", end_time: "15:30", treatment_type: "Traitement de canal", status: "Confirmé", payment_status: "Impayé", notes: "Séance 2", follow_up_status: "Besoin appel", patients: { id: demoPatients[2].id, full_name: demoPatients[2].full_name, phone: demoPatients[2].phone } },
  { id: "da6", patient_id: demoPatients[8].id, appointment_date: iso(0), start_time: "15:30", end_time: "16:00", treatment_type: "Contrôle orthodontique", status: "Confirmé", payment_status: "Payé", notes: "", follow_up_status: "Aucun suivi", patients: { id: demoPatients[8].id, full_name: demoPatients[8].full_name, phone: demoPatients[8].phone } },
  { id: "da7", patient_id: demoPatients[9].id, appointment_date: iso(0), start_time: "16:15", end_time: "17:00", treatment_type: "Détartrage complet", status: "No-show", payment_status: "Impayé", notes: "Absent", follow_up_status: "À recontacter", patients: { id: demoPatients[9].id, full_name: demoPatients[9].full_name, phone: demoPatients[9].phone } },
  { id: "da8", patient_id: demoPatients[4].id, appointment_date: iso(1), start_time: "09:30", end_time: "10:15", treatment_type: "Détartrage complet", status: "Confirmé", payment_status: "Impayé", notes: "", follow_up_status: "Aucun suivi", patients: { id: demoPatients[4].id, full_name: demoPatients[4].full_name, phone: demoPatients[4].phone } },
  { id: "da9", patient_id: demoPatients[7].id, appointment_date: iso(1), start_time: "11:00", end_time: "12:00", treatment_type: "Blanchiment dentaire", status: "Annulé", payment_status: "Impayé", notes: "À reprogrammer", follow_up_status: "En attente réponse", patients: { id: demoPatients[7].id, full_name: demoPatients[7].full_name, phone: demoPatients[7].phone } },
  { id: "da10", patient_id: demoPatients[6].id, appointment_date: iso(2), start_time: "10:00", end_time: "10:45", treatment_type: "Consultation implant", status: "Confirmé", payment_status: "Partiel", notes: "", follow_up_status: "Rappel envoyé", patients: { id: demoPatients[6].id, full_name: demoPatients[6].full_name, phone: demoPatients[6].phone } },
  { id: "da11", patient_id: demoPatients[0].id, appointment_date: iso(2), start_time: "15:00", end_time: "16:00", treatment_type: "Couronne céramique", status: "En attente", payment_status: "Partiel", notes: "", follow_up_status: "Confirmé par patient", patients: { id: demoPatients[0].id, full_name: demoPatients[0].full_name, phone: demoPatients[0].phone } },
  { id: "da12", patient_id: demoPatients[2].id, appointment_date: iso(3), start_time: "12:00", end_time: "13:00", treatment_type: "Traitement de canal", status: "Confirmé", payment_status: "Impayé", notes: "", follow_up_status: "Aucun suivi", patients: { id: demoPatients[2].id, full_name: demoPatients[2].full_name, phone: demoPatients[2].phone } },
];

export const demoPayments: ApiPayment[] = [
  { id: "dp1", patient_id: demoPatients[1].id, treatment: "Implant dentaire", total_amount: 8500, paid_amount: 3000, remaining_amount: 5500, status: "Partiel", due_date: iso(7), notes: "Acompte reçu", patients: { id: demoPatients[1].id, full_name: demoPatients[1].full_name, phone: demoPatients[1].phone } },
  { id: "dp2", patient_id: demoPatients[4].id, treatment: "Détartrage complet", total_amount: 600, paid_amount: 600, remaining_amount: 0, status: "Payé", due_date: iso(-1), notes: "Espèces", patients: { id: demoPatients[4].id, full_name: demoPatients[4].full_name, phone: demoPatients[4].phone } },
  { id: "dp3", patient_id: demoPatients[0].id, treatment: "Couronne céramique", total_amount: 3000, paid_amount: 1500, remaining_amount: 1500, status: "Partiel", due_date: iso(3), notes: "Plan 2x", patients: { id: demoPatients[0].id, full_name: demoPatients[0].full_name, phone: demoPatients[0].phone } },
  { id: "dp4", patient_id: demoPatients[7].id, treatment: "Blanchiment dentaire", total_amount: 1800, paid_amount: 0, remaining_amount: 1800, status: "Impayé", due_date: iso(2), notes: "", patients: { id: demoPatients[7].id, full_name: demoPatients[7].full_name, phone: demoPatients[7].phone } },
  { id: "dp5", patient_id: demoPatients[2].id, treatment: "Traitement de canal", total_amount: 2200, paid_amount: 0, remaining_amount: 2200, status: "En retard", due_date: iso(-5), notes: "Relance à faire", patients: { id: demoPatients[2].id, full_name: demoPatients[2].full_name, phone: demoPatients[2].phone } },
  { id: "dp6", patient_id: demoPatients[3].id, treatment: "Extraction dentaire", total_amount: 1500, paid_amount: 1500, remaining_amount: 0, status: "Payé", due_date: iso(-3), notes: "Carte bancaire", patients: { id: demoPatients[3].id, full_name: demoPatients[3].full_name, phone: demoPatients[3].phone } },
  { id: "dp7", patient_id: demoPatients[8].id, treatment: "Contrôle orthodontique", total_amount: 1200, paid_amount: 1200, remaining_amount: 0, status: "Payé", due_date: iso(0), notes: "Mensualité", patients: { id: demoPatients[8].id, full_name: demoPatients[8].full_name, phone: demoPatients[8].phone } },
  { id: "dp8", patient_id: demoPatients[5].id, treatment: "Consultation enfant", total_amount: 400, paid_amount: 400, remaining_amount: 0, status: "Payé", due_date: iso(-2), notes: "", patients: { id: demoPatients[5].id, full_name: demoPatients[5].full_name, phone: demoPatients[5].phone } },
  { id: "dp9", patient_id: demoPatients[9].id, treatment: "Couronne céramique", total_amount: 3000, paid_amount: 800, remaining_amount: 2200, status: "En retard", due_date: iso(-8), notes: "Promesse vendredi", patients: { id: demoPatients[9].id, full_name: demoPatients[9].full_name, phone: demoPatients[9].phone } },
  { id: "dp10", patient_id: demoPatients[6].id, treatment: "Consultation implant", total_amount: 700, paid_amount: 300, remaining_amount: 400, status: "Partiel", due_date: iso(10), notes: "", patients: { id: demoPatients[6].id, full_name: demoPatients[6].full_name, phone: demoPatients[6].phone } },
];

export const demoRecalls = [
  { id: "dr1", patient: "Salma Tazi", phone: "+212 662 19 77 30", type: "Détartrage", nextRecall: iso(0), status: "due_soon" },
  { id: "dr2", patient: "Imane El Fassi", phone: "+212 661 02 88 47", type: "Contrôle annuel", nextRecall: iso(-7), status: "overdue" },
  { id: "dr3", patient: "Lina Alaoui", phone: "+212 669 12 45 78", type: "Contrôle orthodontique", nextRecall: iso(4), status: "scheduled" },
  { id: "dr4", patient: "Karim Bennani", phone: "+212 665 44 12 90", type: "Suivi implant", nextRecall: iso(23), status: "scheduled" },
  { id: "dr5", patient: "Omar Benjelloun", phone: "+212 670 88 21 04", type: "Contrôle post-traitement", nextRecall: iso(5), status: "due_soon" },
  { id: "dr6", patient: "Amine Berrada", phone: "+212 666 33 21 09", type: "Détartrage", nextRecall: iso(-3), status: "overdue" },
  { id: "dr7", patient: "Mehdi Lahlou", phone: "+212 663 71 56 12", type: "Contrôle enfant", nextRecall: iso(60), status: "scheduled" },
  { id: "dr8", patient: "Soufiane Ait Taleb", phone: "+212 664 78 90 12", type: "Relance devis", nextRecall: iso(2), status: "scheduled" },
];

export const demoReviews = [
  { id: "drev1", patient: "Omar Benjelloun", phone: "+212 670 88 21 04", status: "reviewed", visitDate: iso(-3) },
  { id: "drev2", patient: "Karim Bennani", phone: "+212 665 44 12 90", status: "sent", visitDate: iso(-8), sentAt: iso(-8) },
  { id: "drev3", patient: "Mehdi Lahlou", phone: "+212 663 71 56 12", status: "not_sent", visitDate: iso(-2) },
  { id: "drev4", patient: "Amine Berrada", phone: "+212 666 33 21 09", status: "reviewed", visitDate: iso(-4) },
  { id: "drev5", patient: "Lina Alaoui", phone: "+212 669 12 45 78", status: "sent", visitDate: iso(-10), sentAt: iso(-10) },
  { id: "drev6", patient: "Yasmine El Amrani", phone: "+212 661 23 45 67", status: "not_sent", visitDate: iso(-6) },
  { id: "drev7", patient: "Salma Tazi", phone: "+212 662 19 77 30", status: "not_sent", visitDate: iso(-1) },
  { id: "drev8", patient: "Nadia Chraibi", phone: "+212 668 90 33 21", status: "sent", visitDate: iso(-12), sentAt: iso(-12) },
];

export const demoFavoriteMedications = [
  "Amoxicilline",
  "Paracétamol",
  "Ibuprofène",
  "Bain de bouche",
  "Antibiotique",
  "Anti-inflammatoire",
  "Antalgique",
  "Antiseptique",
];

export const demoPrescriptions = [
  { id: "rx1", patient: "Yasmine El Amrani", items: ["Amoxicilline 1g", "Paracétamol 1g"] },
  { id: "rx2", patient: "Karim Bennani", items: ["Ibuprofène 400mg", "Bain de bouche"] },
  { id: "rx3", patient: "Nadia Chraibi", items: ["Antibiotique", "Antalgique"] },
  { id: "rx4", patient: "Omar Benjelloun", items: ["Antiseptique", "Paracétamol"] },
  { id: "rx5", patient: "Salma Tazi", items: ["Anti-inflammatoire"] },
];

export const demoCertificates = [
  { id: "cert1", patient: "Yasmine El Amrani", type: "Repos médical", days: 2 },
  { id: "cert2", patient: "Karim Bennani", type: "Attestation de soins", days: 1 },
  { id: "cert3", patient: "Nadia Chraibi", type: "Repos médical", days: 3 },
  { id: "cert4", patient: "Omar Benjelloun", type: "Certificat de présence", days: 1 },
  { id: "cert5", patient: "Lina Alaoui", type: "Attestation orthodontie", days: 1 },
];

export const demoWhatsappLogs = [
  { id: "wa1", patient: "Yasmine El Amrani", type: "Rappel RDV", status: "Préparé" },
  { id: "wa2", patient: "Karim Bennani", type: "Relance paiement", status: "Envoyé" },
  { id: "wa3", patient: "Nadia Chraibi", type: "Rappel paiement", status: "Préparé" },
  { id: "wa4", patient: "Omar Benjelloun", type: "Demande avis", status: "Envoyé" },
  { id: "wa5", patient: "Salma Tazi", type: "Rappel recall", status: "Préparé" },
  { id: "wa6", patient: "Mehdi Lahlou", type: "Ordonnance", status: "Envoyé" },
  { id: "wa7", patient: "Imane El Fassi", type: "Certificat", status: "Préparé" },
  { id: "wa8", patient: "Soufiane Ait Taleb", type: "Relance devis", status: "Envoyé" },
];
