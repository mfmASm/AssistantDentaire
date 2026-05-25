from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.security import AuthUser
from app.core.supabase import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class OnboardPayload(BaseModel):
    cabinet_name: str = Field(min_length=1)
    dentist_name: str | None = None
    phone: str | None = None
    city: str | None = None
    address: str | None = None
    whatsapp_number: str | None = None
    google_review_link: str | None = None
    full_name: str | None = None


@router.get("/me")
def me(current_user: AuthUser):
    return current_user


@router.post("/onboard")
def onboard(payload: OnboardPayload, current_user: AuthUser):
    supabase = get_supabase()
    cabinet = supabase.table("cabinets").insert(
        {
            "name": payload.cabinet_name,
            "dentist_name": payload.dentist_name,
            "phone": payload.phone,
            "city": payload.city,
            "address": payload.address,
            "whatsapp_number": payload.whatsapp_number,
            "google_review_link": payload.google_review_link,
        }
    ).execute().data[0]
    profile = supabase.table("profiles").upsert(
        {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": payload.full_name or payload.dentist_name,
            "role": "admin",
            "cabinet_id": cabinet["id"],
        }
    ).execute().data[0]
    return {"cabinet": cabinet, "profile": profile}
