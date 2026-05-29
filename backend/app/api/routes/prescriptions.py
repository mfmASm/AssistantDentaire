from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api.routes.crud import _supabase_error_detail
from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import PrescriptionIn, PrescriptionItemIn
from app.services.pdf_service import generate_document_pdf
from app.utils.references import make_reference

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

ALLOWED_STATUSES = {"Brouillon", "Finalisée", "Envoyée", "Imprimée"}


def _validate_status(status: str | None, current_user: AuthUser):
    if status is None:
        return
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid prescription status")
    if status == "Finalisée" and current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")


def _get_prescription(prescription_id: str, cabinet_id: str):
    response = get_supabase().table("prescriptions").select("*").eq("id", prescription_id).eq("cabinet_id", cabinet_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data


@router.get("")
def list_prescriptions(current_user: AuthUser):
    return get_supabase().table("prescriptions").select("*").eq("cabinet_id", current_user.cabinet_id).order("created_at", desc=True).execute().data or []


@router.get("/{prescription_id}")
def get_prescription(prescription_id: str, current_user: AuthUser):
    prescription = _get_prescription(prescription_id, current_user.cabinet_id)
    items = get_supabase().table("prescription_items").select("*").eq("prescription_id", prescription_id).execute().data or []
    return {**prescription, "items": items}


@router.post("")
def create_prescription(payload: PrescriptionIn, current_user: AuthUser):
    _validate_status(payload.status, current_user)
    data = payload.model_dump(exclude={"items"}, exclude_unset=True, mode="json")
    data["cabinet_id"] = current_user.cabinet_id
    data.setdefault("doctor_id", current_user.id)
    data.setdefault("reference", make_reference("ORD"))
    try:
        prescription = get_supabase().table("prescriptions").insert(data).execute().data[0]
        if payload.items:
            items = [item.model_dump(mode="json") | {"prescription_id": prescription["id"]} for item in payload.items]
            get_supabase().table("prescription_items").insert(items).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    return get_prescription(prescription["id"], current_user)


@router.put("/{prescription_id}")
def update_prescription(prescription_id: str, payload: PrescriptionIn, current_user: AuthUser):
    _validate_status(payload.status, current_user)
    data = payload.model_dump(exclude={"items"}, exclude_unset=True, mode="json")
    try:
        response = get_supabase().table("prescriptions").update(data).eq("id", prescription_id).eq("cabinet_id", current_user.cabinet_id).execute()
        if "items" in payload.model_fields_set:
            get_supabase().table("prescription_items").delete().eq("prescription_id", prescription_id).execute()
            if payload.items:
                items = [item.model_dump(mode="json") | {"prescription_id": prescription_id} for item in payload.items]
                get_supabase().table("prescription_items").insert(items).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return get_prescription(prescription_id, current_user)


@router.delete("/{prescription_id}")
def delete_prescription(prescription_id: str, current_user: AuthUser):
    response = get_supabase().table("prescriptions").delete().eq("id", prescription_id).eq("cabinet_id", current_user.cabinet_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


@router.post("/{prescription_id}/duplicate")
def duplicate_prescription(prescription_id: str, current_user: AuthUser):
    original = get_prescription(prescription_id, current_user)
    items = original.pop("items", [])
    for key in ("id", "created_at", "updated_at", "pdf_url"):
        original.pop(key, None)
    original["cabinet_id"] = current_user.cabinet_id
    original["doctor_id"] = current_user.id
    original["reference"] = make_reference("ORD")
    original["status"] = "Brouillon"
    original["prescription_date"] = date.today().isoformat()
    original["pdf_url"] = None
    try:
        created = get_supabase().table("prescriptions").insert(original).execute().data[0]
        if items:
            copied = [
                {
                    "prescription_id": created["id"],
                    "medication_name": item.get("medication_name"),
                    "dosage": item.get("dosage"),
                    "frequency": item.get("frequency"),
                    "duration": item.get("duration"),
                    "instructions": item.get("instructions"),
                }
                for item in items
            ]
            get_supabase().table("prescription_items").insert(copied).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    return get_prescription(created["id"], current_user)


@router.post("/{prescription_id}/finalize")
def finalize_prescription(prescription_id: str, current_user: AuthUser):
    if current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")
    return update_prescription(prescription_id, PrescriptionIn(patient_id=_get_prescription(prescription_id, current_user.cabinet_id)["patient_id"], status="Finalisée"), current_user)


@router.post("/{prescription_id}/mark-sent")
def mark_sent(prescription_id: str, current_user: AuthUser):
    response = get_supabase().table("prescriptions").update({"status": "Envoyée", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", prescription_id).eq("cabinet_id", current_user.cabinet_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("/{prescription_id}/generate-pdf")
def generate_pdf(prescription_id: str, current_user: AuthUser):
    supabase = get_supabase()
    prescription = _get_prescription(prescription_id, current_user.cabinet_id)
    patient = supabase.table("patients").select("*").eq("id", prescription["patient_id"]).eq("cabinet_id", current_user.cabinet_id).single().execute().data
    cabinet = supabase.table("cabinets").select("*").eq("id", current_user.cabinet_id).single().execute().data
    items = supabase.table("prescription_items").select("*").eq("prescription_id", prescription_id).execute().data or []
    body = "<ul>" + "".join(f"<li><strong>{i.get('medication_name','')}</strong> {i.get('dosage') or ''} {i.get('frequency') or ''} {i.get('duration') or ''}<br />{i.get('instructions') or ''}</li>" for i in items) + "</ul>"
    if prescription.get("instructions"):
        body += f"<p>{prescription['instructions']}</p>"
    pdf_url = generate_document_pdf("Ordonnance", cabinet or {}, patient or {}, body, prescription.get("reference") or prescription_id, f"{current_user.cabinet_id}/prescriptions/{prescription_id}.pdf")
    return supabase.table("prescriptions").update({"pdf_url": pdf_url}).eq("id", prescription_id).eq("cabinet_id", current_user.cabinet_id).execute().data[0]


@router.get("/{prescription_id}/items")
def list_items(prescription_id: str, current_user: AuthUser):
    _get_prescription(prescription_id, current_user.cabinet_id)
    return get_supabase().table("prescription_items").select("*").eq("prescription_id", prescription_id).execute().data or []


@router.post("/{prescription_id}/items")
def create_item(prescription_id: str, payload: PrescriptionItemIn, current_user: AuthUser):
    _get_prescription(prescription_id, current_user.cabinet_id)
    try:
        return get_supabase().table("prescription_items").insert(payload.model_dump(mode="json") | {"prescription_id": prescription_id}).execute().data[0]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc


@router.put("/{prescription_id}/items/{item_id}")
def update_item(prescription_id: str, item_id: str, payload: PrescriptionItemIn, current_user: AuthUser):
    _get_prescription(prescription_id, current_user.cabinet_id)
    response = get_supabase().table("prescription_items").update(payload.model_dump(exclude_unset=True, mode="json")).eq("id", item_id).eq("prescription_id", prescription_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.delete("/{prescription_id}/items/{item_id}")
def delete_item(prescription_id: str, item_id: str, current_user: AuthUser):
    _get_prescription(prescription_id, current_user.cabinet_id)
    get_supabase().table("prescription_items").delete().eq("id", item_id).eq("prescription_id", prescription_id).execute()
    return {"deleted": True}
