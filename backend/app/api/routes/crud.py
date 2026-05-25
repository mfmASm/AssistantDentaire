from typing import Any, Type

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.security import AuthUser
from app.core.supabase import get_supabase


def _apply_scope(query, cabinet_id: str):
    return query.eq("cabinet_id", cabinet_id)


def _tenant_payload(payload: BaseModel | dict[str, Any], cabinet_id: str) -> dict[str, Any]:
    data = payload if isinstance(payload, dict) else payload.model_dump(exclude_unset=True)
    data = dict(data)
    data["cabinet_id"] = cabinet_id
    return data


def create_crud_router(table: str, schema: Type[BaseModel], prefix: str, tags: list[str]) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=tags)

    @router.get("")
    def list_rows(current_user: AuthUser):
        response = _apply_scope(get_supabase().table(table).select("*"), current_user.cabinet_id).order("created_at", desc=True).execute()
        return response.data or []

    @router.get("/{row_id}")
    def get_row(row_id: str, current_user: AuthUser):
        response = _apply_scope(get_supabase().table(table).select("*").eq("id", row_id), current_user.cabinet_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Not found")
        return response.data

    @router.post("")
    def create_row(payload: schema, current_user: AuthUser):  # type: ignore[valid-type]
        response = get_supabase().table(table).insert(_tenant_payload(payload, current_user.cabinet_id)).execute()
        return response.data[0] if response.data else None

    @router.put("/{row_id}")
    def update_row(row_id: str, payload: schema, current_user: AuthUser):  # type: ignore[valid-type]
        response = (
            _apply_scope(get_supabase().table(table).update(payload.model_dump(exclude_unset=True)).eq("id", row_id), current_user.cabinet_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Not found")
        return response.data[0]

    @router.delete("/{row_id}")
    def delete_row(row_id: str, current_user: AuthUser):
        response = _apply_scope(get_supabase().table(table).delete().eq("id", row_id), current_user.cabinet_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Not found")
        return {"deleted": True}

    return router
