import { patients, type Patient } from "@/lib/demo-data";
import { withApiFallback } from "@/services/api";
import { makeCrudApi } from "@/services/crudApi";

export type PatientPayload = {
  full_name: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: string;
  address?: string;
  status?: string;
  notes?: string;
};

export type ApiPatient = PatientPayload & {
  id: string;
  created_at?: string;
  updated_at?: string;
};

export type PatientRecord = Patient & {
  full_name: string;
  age?: number;
  gender?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
};

const crud = makeCrudApi<ApiPatient, PatientPayload>("/patients");

export const patientsApi = {
  ...crud,
  listWithFallback: () => withApiFallback(crud.list(), patients.map(fromMockPatient)),
};

export function toUiPatient(patient: ApiPatient): PatientRecord {
  return {
    id: patient.id,
    full_name: patient.full_name,
    name: patient.full_name,
    phone: patient.phone || "",
    email: patient.email || "",
    age: patient.age,
    gender: patient.gender,
    address: patient.address,
    status: toUiPatientStatus(patient.status),
    lastVisit: patient.updated_at || patient.created_at || new Date().toISOString(),
    notes: patient.notes || "",
    created_at: patient.created_at,
    updated_at: patient.updated_at,
  };
}

export function fromMockPatient(patient: Patient): ApiPatient {
  return {
    id: patient.id,
    full_name: patient.name,
    phone: patient.phone,
    email: patient.email,
    status: patient.status,
    notes: patient.notes,
    updated_at: patient.lastVisit,
  };
}

function toUiPatientStatus(status?: string): Patient["status"] {
  if (status === "Paiement dû") return "payment_pending";
  if (status === "Rappel dû") return "recall_due";
  if (status === "Suivi") return "follow_up";
  if (status === "payment_pending" || status === "recall_due" || status === "follow_up") return status;
  return "active";
}
