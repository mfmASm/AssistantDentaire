from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api.routes.crud import _supabase_error_detail
from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import WhatsAppLogIn
from app.services.whatsapp_service import build_whatsapp_response

router = APIRouter(prefix="/whatsapp-logs", tags=["whatsapp-logs"])


@router.get("")
def list_logs(current_user: AuthUser):
    response = (
        get_supabase()
        .table("whatsapp_logs")
        .select("*")
        .eq("cabinet_id", current_user.cabinet_id)
        .order("sent_at", desc=True)
        .execute()
    )
    return response.data or []


@router.post("")
def create_log(payload: WhatsAppLogIn, current_user: AuthUser):
    data = payload.model_dump(mode="json")
    data["cabinet_id"] = current_user.cabinet_id
    data["sent_by"] = current_user.id
    data["sent_at"] = datetime.now(timezone.utc).isoformat()
    try:
        response = get_supabase().table("whatsapp_logs").insert(data).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    log = response.data[0] if response.data else None
    return {**build_whatsapp_response(payload.phone, payload.message, payload.type), "log": log}
