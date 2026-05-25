from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api.routes.crud import _tenant_payload
from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import ReviewIn

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("")
def list_reviews(current_user: AuthUser):
    return get_supabase().table("review_requests").select("*").eq("cabinet_id", current_user.cabinet_id).order("created_at", desc=True).execute().data or []


@router.post("")
def create_review(payload: ReviewIn, current_user: AuthUser):
    response = get_supabase().table("review_requests").insert(_tenant_payload(payload, current_user.cabinet_id)).execute()
    return response.data[0] if response.data else None


@router.put("/{review_id}")
def update_review(review_id: str, payload: ReviewIn, current_user: AuthUser):
    response = get_supabase().table("review_requests").update(payload.model_dump(exclude_unset=True)).eq("id", review_id).eq("cabinet_id", current_user.cabinet_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("/{review_id}/mark-sent")
def mark_sent(review_id: str, current_user: AuthUser):
    response = (
        get_supabase()
        .table("review_requests")
        .update({"status": "Envoyé", "sent_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", review_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]
