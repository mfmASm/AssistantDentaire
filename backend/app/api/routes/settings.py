from fastapi import APIRouter, HTTPException

from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import SettingIn, TemplateIn

router = APIRouter(tags=["settings"])


def _require_admin(current_user: AuthUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul le docteur propriétaire peut modifier ces paramètres.")


@router.get("/settings")
def list_settings(current_user: AuthUser):
    return get_supabase().table("settings").select("*").eq("cabinet_id", current_user.cabinet_id).execute().data or []


@router.get("/settings/{key}")
def get_setting(key: str, current_user: AuthUser):
    response = (
        get_supabase()
        .table("settings")
        .select("*")
        .eq("cabinet_id", current_user.cabinet_id)
        .eq("key", key)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    return response.data[0]


@router.put("/settings/{key}")
def upsert_setting(key: str, payload: SettingIn, current_user: AuthUser):
    _require_admin(current_user)
    response = (
        get_supabase()
        .table("settings")
        .upsert(
            {"cabinet_id": current_user.cabinet_id, "key": key, "value": payload.value},
            on_conflict="cabinet_id,key",
        )
        .execute()
    )
    return response.data[0] if response.data else None


@router.get("/templates")
def list_templates(current_user: AuthUser):
    return get_supabase().table("document_templates").select("*").eq("cabinet_id", current_user.cabinet_id).execute().data or []


@router.post("/templates")
def create_template(payload: TemplateIn, current_user: AuthUser):
    return get_supabase().table("document_templates").insert(payload.model_dump() | {"cabinet_id": current_user.cabinet_id}).execute().data[0]


@router.put("/templates/{template_id}")
def update_template(template_id: str, payload: TemplateIn, current_user: AuthUser):
    return get_supabase().table("document_templates").update(payload.model_dump(exclude_unset=True)).eq("id", template_id).eq("cabinet_id", current_user.cabinet_id).execute().data[0]


@router.delete("/templates/{template_id}")
def delete_template(template_id: str, current_user: AuthUser):
    get_supabase().table("document_templates").delete().eq("id", template_id).eq("cabinet_id", current_user.cabinet_id).execute()
    return {"deleted": True}
