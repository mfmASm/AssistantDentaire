from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.security import AuthUser
from app.core.supabase import get_supabase

router = APIRouter(prefix="/team", tags=["team"])


class TeamInvitePayload(BaseModel):
    full_name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    role: str


def _require_admin(current_user: AuthUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the cabinet owner can manage the team")


@router.get("")
def list_team(current_user: AuthUser):
    _require_admin(current_user)
    response = (
        get_supabase()
        .table("profiles")
        .select("id, full_name, email, role, cabinet_id, created_at")
        .eq("cabinet_id", current_user.cabinet_id)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data or []


@router.post("/invite")
def invite_team_member(payload: TeamInvitePayload, current_user: AuthUser):
    _require_admin(current_user)
    if payload.role not in {"doctor", "secretary"}:
        raise HTTPException(status_code=400, detail="Role must be doctor or secretary")

    return {
        "status": "todo",
        "message": "Invitation backend à finaliser",
        "invitee": payload.model_dump(),
    }
