from datetime import date

from fastapi import APIRouter

from app.core.security import AuthUser
from app.core.supabase import get_supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(current_user: AuthUser):
    supabase = get_supabase()
    today = date.today().isoformat()
    cabinet_id = current_user.cabinet_id

    appointments_today = supabase.table("appointments").select("*").eq("cabinet_id", cabinet_id).eq("appointment_date", today).execute().data or []
    payments = supabase.table("payments").select("*").eq("cabinet_id", cabinet_id).execute().data or []
    recalls_due = supabase.table("recalls").select("*").eq("cabinet_id", cabinet_id).lte("next_recall_date", today).neq("status", "Terminé").execute().data or []
    pending_reviews = supabase.table("review_requests").select("*").eq("cabinet_id", cabinet_id).eq("status", "Non envoyé").execute().data or []
    prescriptions_today = supabase.table("prescriptions").select("id").eq("cabinet_id", cabinet_id).eq("prescription_date", today).execute().data or []
    certificates_today = supabase.table("medical_certificates").select("id").eq("cabinet_id", cabinet_id).eq("certificate_date", today).execute().data or []

    return {
        "appointments_today_count": len(appointments_today),
        "unpaid_balances_total": sum(float(p.get("remaining_amount") or 0) for p in payments if p.get("status") != "Payé"),
        "payments_collected_today": sum(float(p.get("paid_amount") or 0) for p in payments if p.get("created_at", "").startswith(today)),
        "recalls_due_count": len(recalls_due),
        "review_requests_pending": len(pending_reviews),
        "prescriptions_today_count": len(prescriptions_today),
        "certificates_today_count": len(certificates_today),
        "recent_patients": supabase.table("patients").select("*").eq("cabinet_id", cabinet_id).order("created_at", desc=True).limit(5).execute().data or [],
        "upcoming_appointments": supabase.table("appointments").select("*").eq("cabinet_id", cabinet_id).gte("appointment_date", today).order("appointment_date").limit(5).execute().data or [],
        "overdue_payments": [p for p in payments if p.get("status") != "Payé" and p.get("due_date") and p["due_date"] < today][:5],
        "due_recalls": recalls_due[:5],
    }
