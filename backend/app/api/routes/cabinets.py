from fastapi import APIRouter

from app.core.security import AuthUser
from app.core.supabase import get_supabase

router = APIRouter(prefix="/cabinets", tags=["cabinets"])


@router.get("/me")
def get_my_cabinet(current_user: AuthUser):
    return get_supabase().table("cabinets").select("*").eq("id", current_user.cabinet_id).single().execute().data
