from fastapi import HTTPException

from app.core.supabase import get_supabase


RESOURCE_NOT_FOUND = "Ressource introuvable."
PATIENT_NOT_FOUND = "Patient introuvable."
APPOINTMENT_NOT_FOUND = "Rendez-vous introuvable."


def _ensure_row_in_cabinet(table: str, row_id: str, cabinet_id: str, detail: str = RESOURCE_NOT_FOUND) -> dict:
    response = (
        get_supabase()
        .table(table)
        .select("*")
        .eq("id", str(row_id))
        .eq("cabinet_id", cabinet_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail=detail)
    return response.data[0]


def ensure_patient_in_cabinet(patient_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("patients", str(patient_id), cabinet_id, PATIENT_NOT_FOUND)


def ensure_appointment_in_cabinet(appointment_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("appointments", str(appointment_id), cabinet_id, APPOINTMENT_NOT_FOUND)


def ensure_prescription_in_cabinet(prescription_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("prescriptions", str(prescription_id), cabinet_id)


def ensure_certificate_in_cabinet(certificate_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("medical_certificates", str(certificate_id), cabinet_id)


def ensure_payment_in_cabinet(payment_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("payments", str(payment_id), cabinet_id)


def ensure_recall_in_cabinet(recall_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("recalls", str(recall_id), cabinet_id)


def ensure_review_request_in_cabinet(review_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("review_requests", str(review_id), cabinet_id)


def ensure_favorite_medication_in_cabinet(favorite_id, cabinet_id: str) -> dict:
    return _ensure_row_in_cabinet("favorite_medications", str(favorite_id), cabinet_id)
