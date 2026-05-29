from typing import Any, Type

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.utils.ownership import (
    ensure_favorite_medication_in_cabinet,
    ensure_patient_in_cabinet,
    ensure_recall_in_cabinet,
)


def _apply_scope(query, cabinet_id: str):
    return query.eq("cabinet_id", cabinet_id)


def _tenant_payload(payload: BaseModel | dict[str, Any], cabinet_id: str) -> dict[str, Any]:
    data = payload if isinstance(payload, dict) else payload.model_dump(exclude_unset=True, mode="json")
    data = dict(data)
    data["cabinet_id"] = cabinet_id
    return data


def _supabase_error_detail(exc: Exception) -> Any:
    detail = getattr(exc, "details", None)
    if detail:
        return detail
    message = getattr(exc, "message", None)
    if message:
        return message
    if exc.args:
        return exc.args[0]
    return str(exc)


def _validate_references(table: str, data: dict[str, Any], cabinet_id: str) -> None:
    if table == "recalls" and data.get("patient_id"):
        ensure_patient_in_cabinet(data["patient_id"], cabinet_id)


def _ensure_owned_row(table: str, row_id: str, cabinet_id: str) -> None:
    if table == "recalls":
        ensure_recall_in_cabinet(row_id, cabinet_id)
    elif table == "favorite_medications":
        ensure_favorite_medication_in_cabinet(row_id, cabinet_id)


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
        insert_payload = _tenant_payload(payload, current_user.cabinet_id)
        _validate_references(table, insert_payload, current_user.cabinet_id)
        try:
            response = get_supabase().table(table).insert(insert_payload).execute()
        except Exception as exc:
            raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
        return response.data[0] if response.data else None

    @router.put("/{row_id}")
    def update_row(row_id: str, payload: schema, current_user: AuthUser):  # type: ignore[valid-type]
        _ensure_owned_row(table, row_id, current_user.cabinet_id)
        update_payload = payload.model_dump(exclude_unset=True, mode="json")
        update_payload.pop("cabinet_id", None)
        _validate_references(table, update_payload, current_user.cabinet_id)
        response = (
            _apply_scope(get_supabase().table(table).update(update_payload).eq("id", row_id), current_user.cabinet_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Not found")
        return response.data[0]

    @router.delete("/{row_id}")
    def delete_row(row_id: str, current_user: AuthUser):
        _ensure_owned_row(table, row_id, current_user.cabinet_id)
        response = _apply_scope(get_supabase().table(table).delete().eq("id", row_id), current_user.cabinet_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Not found")
        return {"deleted": True}

    return router
