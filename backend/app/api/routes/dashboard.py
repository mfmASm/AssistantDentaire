from datetime import date
from typing import Any
import unicodedata

from fastapi import APIRouter

from app.core.security import AuthUser
from app.core.supabase import get_supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(current_user: AuthUser):
    supabase = get_supabase()
    today = date.today().isoformat()
    month = today[:7]
    cabinet_id = current_user.cabinet_id

    def query(table: str, select: str = "*") -> list[dict[str, Any]]:
        try:
            return supabase.table(table).select(select).eq("cabinet_id", cabinet_id).execute().data or []
        except Exception:
            return []

    def norm(value: Any) -> str:
        normalized = unicodedata.normalize("NFKD", str(value or ""))
        without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
        return without_accents.strip().lower()

    def amount(value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0

    def starts_with(value: Any, prefix: str) -> bool:
        return str(value or "").startswith(prefix)

    def patient_name(row: dict[str, Any]) -> str | None:
        patient = row.get("patients")
        if isinstance(patient, dict):
            return patient.get("full_name")
        return row.get("patient_name")

    patients = query("patients")
    appointments = query("appointments", "*, patients(id, full_name, phone)")
    payments = query("payments", "*, patients(id, full_name, phone)")
    recalls = query("recalls", "*, patients(id, full_name, phone)")
    reviews = query("review_requests", "*, patients(id, full_name, phone)")
    prescriptions = query("prescriptions", "*, patients(id, full_name, phone)")
    certificates = query("medical_certificates", "*, patients(id, full_name, phone)")

    appointments_today = [row for row in appointments if row.get("appointment_date") == today]
    upcoming_appointments_all = [
        row
        for row in appointments
        if str(row.get("appointment_date") or "") >= today and norm(row.get("status")) not in {"annule", "cancelled", "canceled"}
    ]
    unpaid_payments = [row for row in payments if amount(row.get("remaining_amount")) > 0]
    overdue_payments_all = [row for row in unpaid_payments if row.get("due_date") and str(row["due_date"]) < today]
    due_recalls_all = [
        row
        for row in recalls
        if row.get("next_recall_date") and str(row["next_recall_date"]) <= today and norm(row.get("status")) != "termine"
    ]
    pending_reviews = [row for row in reviews if norm(row.get("status")) in {"non envoye", "not_sent", "not sent"}]
    sent_reviews = [row for row in reviews if norm(row.get("status")) in {"envoye", "sent"}]
    prescriptions_today = [row for row in prescriptions if row.get("prescription_date") == today]
    certificates_today = [row for row in certificates if row.get("certificate_date") == today]

    recent_patients = sorted(patients, key=lambda row: str(row.get("created_at") or ""), reverse=True)[:5]
    upcoming_appointments = sorted(
        upcoming_appointments_all,
        key=lambda row: (str(row.get("appointment_date") or ""), str(row.get("start_time") or "")),
    )[:5]
    overdue_payments = sorted(overdue_payments_all, key=lambda row: str(row.get("due_date") or ""))[:5]
    due_recalls = sorted(due_recalls_all, key=lambda row: str(row.get("next_recall_date") or ""))[:5]

    def activity(source_type: str, title: str, description: str, created_at: Any) -> dict[str, str]:
        return {
            "type": source_type,
            "title": title,
            "description": description,
            "created_at": str(created_at or ""),
        }

    recent_activity = []
    for row in sorted(patients, key=lambda item: str(item.get("created_at") or ""), reverse=True)[:3]:
        recent_activity.append(activity("patient", "Patient ajoute", row.get("full_name") or "Patient", row.get("created_at")))
    for row in sorted(appointments, key=lambda item: str(item.get("created_at") or ""), reverse=True)[:3]:
        recent_activity.append(activity("appointment", "Rendez-vous cree", patient_name(row) or "Patient", row.get("created_at")))
    for row in sorted(payments, key=lambda item: str(item.get("created_at") or ""), reverse=True)[:3]:
        recent_activity.append(activity("payment", "Paiement cree", patient_name(row) or row.get("treatment") or "Paiement", row.get("created_at")))
    for row in sorted(recalls, key=lambda item: str(item.get("created_at") or ""), reverse=True)[:3]:
        recent_activity.append(activity("recall", "Rappel cree", patient_name(row) or row.get("recall_type") or "Rappel", row.get("created_at")))
    for row in sorted(prescriptions, key=lambda item: str(item.get("created_at") or ""), reverse=True)[:3]:
        recent_activity.append(activity("prescription", "Ordonnance creee", patient_name(row) or row.get("reference") or "Ordonnance", row.get("created_at")))
    for row in sorted(certificates, key=lambda item: str(item.get("created_at") or ""), reverse=True)[:3]:
        recent_activity.append(activity("certificate", "Certificat cree", patient_name(row) or row.get("reference") or "Certificat", row.get("created_at")))
    recent_activity = sorted(recent_activity, key=lambda row: row["created_at"], reverse=True)[:10]

    return {
        "appointments_today_count": len(appointments_today),
        "upcoming_appointments_count": len(upcoming_appointments_all),
        "patients_total": len(patients),
        "new_patients_this_month": len([row for row in patients if starts_with(row.get("created_at"), month)]),
        "payments_collected_today": sum(amount(row.get("paid_amount")) for row in payments if starts_with(row.get("created_at"), today)),
        "payments_collected_month": sum(amount(row.get("paid_amount")) for row in payments if starts_with(row.get("created_at"), month)),
        "unpaid_balances_total": sum(amount(row.get("remaining_amount")) for row in unpaid_payments),
        "overdue_payments_count": len(overdue_payments_all),
        "recalls_due_count": len(due_recalls_all),
        "review_requests_pending": len(pending_reviews),
        "review_requests_sent": len(sent_reviews),
        "prescriptions_today_count": len(prescriptions_today),
        "certificates_today_count": len(certificates_today),
        "recent_patients": [
            {
                "id": row.get("id"),
                "full_name": row.get("full_name"),
                "phone": row.get("phone"),
                "status": row.get("status"),
                "created_at": row.get("created_at"),
            }
            for row in recent_patients
        ],
        "upcoming_appointments": [
            {
                "id": row.get("id"),
                "patient_id": row.get("patient_id"),
                "patient_name": patient_name(row),
                "appointment_date": row.get("appointment_date"),
                "start_time": row.get("start_time"),
                "treatment_type": row.get("treatment_type"),
                "status": row.get("status"),
                "payment_status": row.get("payment_status"),
                "follow_up_status": row.get("follow_up_status"),
            }
            for row in upcoming_appointments
        ],
        "overdue_payments": [
            {
                "id": row.get("id"),
                "patient_id": row.get("patient_id"),
                "patient_name": patient_name(row),
                "treatment": row.get("treatment"),
                "remaining_amount": amount(row.get("remaining_amount")),
                "due_date": row.get("due_date"),
                "status": row.get("status"),
            }
            for row in overdue_payments
        ],
        "due_recalls": [
            {
                "id": row.get("id"),
                "patient_id": row.get("patient_id"),
                "patient_name": patient_name(row),
                "phone": (row.get("patients") or {}).get("phone") if isinstance(row.get("patients"), dict) else None,
                "recall_type": row.get("recall_type"),
                "next_recall_date": row.get("next_recall_date"),
                "status": row.get("status"),
            }
            for row in due_recalls
        ],
        "recent_activity": recent_activity,
    }
