from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import AuthenticatedAuthUser, AuthUser
from app.core.supabase import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class OnboardPayload(BaseModel):
    cabinet_name: str | None = Field(default=None, min_length=1)
    dentist_name: str | None = None
    phone: str | None = None
    city: str | None = None
    address: str | None = None
    whatsapp_number: str | None = None
    google_review_link: str | None = None
    full_name: str | None = None


@router.get("/me")
def me(current_user: AuthUser):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "cabinet_id": current_user.cabinet_id,
        "cabinet": current_user.cabinet,
    }


@router.post("/onboard")
def onboard(payload: OnboardPayload, current_user: AuthenticatedAuthUser):
    supabase = get_supabase()
    try:
        existing_profile = supabase.table("profiles").select("*").eq("id", current_user.id).single().execute().data
    except Exception:
        existing_profile = None
    if existing_profile and existing_profile.get("cabinet_id"):
        try:
            cabinet = (
                supabase
                .table("cabinets")
                .select("*")
                .eq("id", existing_profile["cabinet_id"])
                .single()
                .execute()
                .data
            )
        except Exception:
            cabinet = None
        return {"cabinet": cabinet, "profile": existing_profile}

    cabinet_name = payload.cabinet_name or "Cabinet AssistantDentaire"
    cabinet = supabase.table("cabinets").insert(
        {
            "name": cabinet_name,
            "dentist_name": payload.dentist_name,
            "phone": payload.phone,
            "city": payload.city,
            "address": payload.address,
            "whatsapp_number": payload.whatsapp_number,
            "google_review_link": payload.google_review_link,
        }
    ).execute().data[0]

    profile_payload = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": payload.full_name or payload.dentist_name or current_user.email,
        "role": "admin",
        "cabinet_id": cabinet["id"],
    }

    profile_response = supabase.table("profiles").upsert(profile_payload).execute()
    if not profile_response.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create profile")

    profile = profile_response.data[0]
    return {"cabinet": cabinet, "profile": profile}
