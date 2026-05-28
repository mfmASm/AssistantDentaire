from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api.routes.crud import _supabase_error_detail
from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import ReviewIn, ReviewUpdate

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("")
def list_reviews(current_user: AuthUser):
    return get_supabase().table("review_requests").select("*").eq("cabinet_id", current_user.cabinet_id).order("created_at", desc=True).execute().data or []


@router.post("")
def create_review(payload: ReviewIn, current_user: AuthUser):
    insert_payload = {
        "cabinet_id": current_user.cabinet_id,
        "patient_id": str(payload.patient_id),
        "appointment_id": str(payload.appointment_id) if payload.appointment_id else None,
        "status": "Non envoyé",
        "sent_at": None,
        "reviewed_at": None,
    }
    try:
        response = get_supabase().table("review_requests").insert(insert_payload).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    return response.data[0] if response.data else None


@router.put("/{review_id}")
def update_review(review_id: str, payload: ReviewUpdate, current_user: AuthUser):
    update_payload = payload.model_dump(exclude_unset=True, mode="json")
    if update_payload.get("status") == "Envoyé" and "sent_at" not in update_payload:
        update_payload["sent_at"] = datetime.now(timezone.utc).isoformat()
    if update_payload.get("status") == "Avis reçu" and "reviewed_at" not in update_payload:
        update_payload["reviewed_at"] = datetime.now(timezone.utc).isoformat()
    try:
        response = (
            get_supabase()
            .table("review_requests")
            .update(update_payload)
            .eq("id", review_id)
            .eq("cabinet_id", current_user.cabinet_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.delete("/{review_id}")
def delete_review(review_id: str, current_user: AuthUser):
    response = (
        get_supabase()
        .table("review_requests")
        .delete()
        .eq("id", review_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


@router.post("/{review_id}/mark-sent")
def mark_sent(review_id: str, current_user: AuthUser):
    try:
        response = (
            get_supabase()
            .table("review_requests")
            .update({"status": "Envoyé", "sent_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", review_id)
            .eq("cabinet_id", current_user.cabinet_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("/{review_id}/mark-reviewed")
def mark_reviewed(review_id: str, current_user: AuthUser):
    try:
        response = (
            get_supabase()
            .table("review_requests")
            .update({"status": "Avis reçu", "reviewed_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", review_id)
            .eq("cabinet_id", current_user.cabinet_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]
