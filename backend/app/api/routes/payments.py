from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import PaymentIn, PaymentUpdate
from app.utils.ownership import ensure_patient_in_cabinet, ensure_payment_in_cabinet

router = APIRouter(prefix="/payments", tags=["payments"])

PAYMENT_COLUMNS = {
    "patient_id",
    "treatment",
    "total_amount",
    "paid_amount",
    "remaining_amount",
    "status",
    "due_date",
    "notes",
}

PAYMENT_STATUS_MAP = {
    "paye": "Payé",
    "payé": "Payé",
    "paid": "Payé",
    "partiel": "Partiel",
    "partial": "Partiel",
    "impaye": "Impayé",
    "impayé": "Impayé",
    "unpaid": "Impayé",
    "en retard": "En retard",
    "overdue": "En retard",
}


def _scoped_payment(row_id: str, cabinet_id: str):
    response = (
        get_supabase()
        .table("payments")
        .select("*")
        .eq("id", row_id)
        .eq("cabinet_id", cabinet_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def _serialize_payload(data: dict[str, Any]) -> dict[str, Any]:
    serialized = dict(data)
    for key, value in list(serialized.items()):
        if isinstance(value, Decimal):
            serialized[key] = float(value)
        elif isinstance(value, date):
            serialized[key] = value.isoformat()
        elif isinstance(value, UUID):
            serialized[key] = str(value)
    return serialized


def _normalize_payment_status(status: str | None) -> str:
    normalized = (status or "Impayé").strip().lower()
    return PAYMENT_STATUS_MAP.get(normalized, status or "Impayé")


def _patient_in_current_cabinet(patient_id: UUID | str, cabinet_id: str) -> bool:
    try:
        response = (
            get_supabase()
            .table("patients")
            .select("id")
            .eq("id", str(patient_id))
            .eq("cabinet_id", cabinet_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Impossible d'enregistrer les données.") from exc
    return bool(response.data)


def _with_remaining_amount(data: dict[str, Any], existing: dict[str, Any] | None = None) -> dict[str, Any]:
    total = data.get("total_amount", existing.get("total_amount") if existing else 0)
    paid = data.get("paid_amount", existing.get("paid_amount") if existing else 0)
    total_decimal = Decimal(str(total or 0))
    paid_decimal = Decimal(str(paid or 0))
    if paid_decimal > total_decimal:
        raise HTTPException(status_code=422, detail="paid_amount cannot exceed total_amount")
    data["remaining_amount"] = total_decimal - paid_decimal
    return data


@router.get("")
def list_payments(current_user: AuthUser):
    response = (
        get_supabase()
        .table("payments")
        .select("*, patients(id, full_name, phone)")
        .eq("cabinet_id", current_user.cabinet_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.get("/{payment_id}")
def get_payment(payment_id: str, current_user: AuthUser):
    response = (
        get_supabase()
        .table("payments")
        .select("*, patients(id, full_name, phone)")
        .eq("id", payment_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("")
def create_payment(payload: PaymentIn, current_user: AuthUser):
    try:
        ensure_patient_in_cabinet(payload.patient_id, current_user.cabinet_id)

        data = payload.model_dump(exclude_unset=True)
        data = {key: value for key, value in data.items() if key in PAYMENT_COLUMNS}
        data["status"] = _normalize_payment_status(data.get("status"))
        data = _serialize_payload(_with_remaining_amount(data))
        data["cabinet_id"] = current_user.cabinet_id

        response = get_supabase().table("payments").insert(data).execute()
        payment = response.data[0] if response.data else None
        if not payment:
            raise HTTPException(status_code=400, detail="Payment not created")
        return payment
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Impossible d'enregistrer les données.") from exc


@router.put("/{payment_id}")
def update_payment(payment_id: str, payload: PaymentUpdate, current_user: AuthUser):
    existing = ensure_payment_in_cabinet(payment_id, current_user.cabinet_id)

    data = payload.model_dump(exclude_unset=True)
    data.pop("cabinet_id", None)
    if data.get("patient_id"):
        ensure_patient_in_cabinet(data["patient_id"], current_user.cabinet_id)
    data = _serialize_payload(_with_remaining_amount(data, existing))
    response = (
        get_supabase()
        .table("payments")
        .update(data)
        .eq("id", payment_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    return response.data[0] if response.data else _scoped_payment(payment_id, current_user.cabinet_id)


@router.delete("/{payment_id}")
def delete_payment(payment_id: str, current_user: AuthUser):
    ensure_payment_in_cabinet(payment_id, current_user.cabinet_id)

    (
        get_supabase()
        .table("payments")
        .delete()
        .eq("id", payment_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    return {"deleted": True}
