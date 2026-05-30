from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.core.cabinet_setup import cabinet_setup_complete

router = APIRouter(prefix="/cabinets", tags=["cabinets"])

ALLOWED_CABINET_FIELDS = {
    "name",
    "dentist_name",
    "address",
    "city",
    "phone",
    "whatsapp_number",
    "google_review_link",
    "logo_url",
}


class CabinetUpdate(BaseModel):
    name: str | None = None
    dentist_name: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    whatsapp_number: str | None = None
    google_review_link: str | None = None
    logo_url: str | None = None


def _require_admin(current_user: AuthUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul le docteur propriétaire peut modifier ces paramètres.")


@router.get("/me")
def get_my_cabinet(current_user: AuthUser):
    cabinet = get_supabase().table("cabinets").select("*").eq("id", current_user.cabinet_id).single().execute().data
    return (cabinet or {}) | {"cabinet_setup_complete": cabinet_setup_complete(cabinet)}


@router.put("/me")
def update_my_cabinet(payload: CabinetUpdate, current_user: AuthUser):
    _require_admin(current_user)
    data: dict[str, Any] = {
        key: value
        for key, value in payload.model_dump(exclude_unset=True).items()
        if key in ALLOWED_CABINET_FIELDS
    }
    if not data:
        return get_my_cabinet(current_user)

    response = (
        get_supabase()
        .table("cabinets")
        .update(data)
        .eq("id", current_user.cabinet_id)
        .execute()
    )
    cabinet = response.data[0] if response.data else get_my_cabinet(current_user)
    return cabinet | {"cabinet_setup_complete": cabinet_setup_complete(cabinet)}
