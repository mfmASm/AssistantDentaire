from fastapi import APIRouter, HTTPException

from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import AppointmentIn, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _scoped_appointment(row_id: str, cabinet_id: str):
    response = (
        get_supabase()
        .table("appointments")
        .select("*")
        .eq("id", row_id)
        .eq("cabinet_id", cabinet_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


@router.get("")
def list_appointments(current_user: AuthUser):
    response = (
        get_supabase()
        .table("appointments")
        .select("*, patients(id, full_name, phone)")
        .eq("cabinet_id", current_user.cabinet_id)
        .order("appointment_date", desc=False)
        .order("start_time", desc=False)
        .execute()
    )
    return response.data or []


@router.get("/{appointment_id}")
def get_appointment(appointment_id: str, current_user: AuthUser):
    response = (
        get_supabase()
        .table("appointments")
        .select("*, patients(id, full_name, phone)")
        .eq("id", appointment_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("")
def create_appointment(payload: AppointmentIn, current_user: AuthUser):
    data = payload.model_dump(exclude_unset=True, mode="json")
    data["cabinet_id"] = current_user.cabinet_id
    response = get_supabase().table("appointments").insert(data).execute()
    appointment = response.data[0] if response.data else None
    if not appointment:
        raise HTTPException(status_code=400, detail="Appointment not created")
    return appointment


@router.put("/{appointment_id}")
def update_appointment(appointment_id: str, payload: AppointmentUpdate, current_user: AuthUser):
    if not _scoped_appointment(appointment_id, current_user.cabinet_id):
        raise HTTPException(status_code=404, detail="Not found")

    data = payload.model_dump(exclude_unset=True, mode="json")
    data.pop("cabinet_id", None)
    response = (
        get_supabase()
        .table("appointments")
        .update(data)
        .eq("id", appointment_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    return response.data[0] if response.data else _scoped_appointment(appointment_id, current_user.cabinet_id)


@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: str, current_user: AuthUser):
    if not _scoped_appointment(appointment_id, current_user.cabinet_id):
        raise HTTPException(status_code=404, detail="Not found")

    (
        get_supabase()
        .table("appointments")
        .delete()
        .eq("id", appointment_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    return {"deleted": True}
