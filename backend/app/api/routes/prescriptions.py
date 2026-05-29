from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException

from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import PrescriptionIn, PrescriptionItemIn
from app.services.pdf_service import (
    PDF_ENGINE_UNAVAILABLE_CODE,
    PDF_ENGINE_UNAVAILABLE_MESSAGE,
    PDF_GENERATION_ERROR,
    PdfGenerationError,
    generate_document_pdf,
    safe_multiline,
    safe_text,
)
from app.services.storage_service import create_signed_document_url, storage_path_from_value
from app.utils.ownership import ensure_patient_in_cabinet, ensure_prescription_in_cabinet
from app.utils.references import make_reference

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

ALLOWED_STATUSES = {"Brouillon", "Finalisée", "Envoyée", "Imprimée"}


def _pdf_engine_unavailable(exc: Exception):
    return HTTPException(
        status_code=503,
        detail={"code": PDF_ENGINE_UNAVAILABLE_CODE, "message": PDF_ENGINE_UNAVAILABLE_MESSAGE},
    )


def _validate_status(status: str | None, current_user: AuthUser):
    if status is None:
        return
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid prescription status")
    if status == "Finalisée" and current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")


def _get_prescription(prescription_id: str, cabinet_id: str):
    return ensure_prescription_in_cabinet(prescription_id, cabinet_id)


def _generate_prescription_pdf(prescription_id: str, current_user: AuthUser):
    supabase = get_supabase()
    prescription = _get_prescription(prescription_id, current_user.cabinet_id)
    patient = supabase.table("patients").select("*").eq("id", prescription["patient_id"]).eq("cabinet_id", current_user.cabinet_id).single().execute().data
    cabinet = supabase.table("cabinets").select("*").eq("id", current_user.cabinet_id).single().execute().data
    items = supabase.table("prescription_items").select("*").eq("prescription_id", prescription_id).execute().data or []
    body = "<ul>" + "".join(
        (
            f"<li><strong>{safe_text(i.get('medication_name'))}</strong> "
            f"{safe_text(i.get('dosage'))} {safe_text(i.get('frequency'))} {safe_text(i.get('duration'))}"
            f"<br />{safe_multiline(i.get('instructions'))}</li>"
        )
        for i in items
    ) + "</ul>"
    if prescription.get("instructions"):
        body += f"<p>{safe_multiline(prescription.get('instructions'))}</p>"
    if prescription.get("motif"):
        body += f"<p><strong>Motif:</strong> {safe_multiline(prescription.get('motif'))}</p>"
    if prescription.get("diagnosis_notes"):
        body += f"<p><strong>Notes:</strong> {safe_multiline(prescription.get('diagnosis_notes'))}</p>"
    storage_path = f"{current_user.cabinet_id}/prescriptions/{prescription_id}.pdf"
    pdf_path = generate_document_pdf("Ordonnance", cabinet or {}, patient or {}, body, prescription.get("reference") or prescription_id, storage_path)
    response = supabase.table("prescriptions").update({"pdf_url": pdf_path}).eq("id", prescription_id).eq("cabinet_id", current_user.cabinet_id).execute()
    return response.data[0]


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
    ensure_patient_in_cabinet(payload.patient_id, current_user.cabinet_id)
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
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer les données.") from exc
    return get_prescription(prescription["id"], current_user)


@router.put("/{prescription_id}")
def update_prescription(prescription_id: str, payload: PrescriptionIn, current_user: AuthUser):
    _validate_status(payload.status, current_user)
    _get_prescription(prescription_id, current_user.cabinet_id)
    ensure_patient_in_cabinet(payload.patient_id, current_user.cabinet_id)
    data = payload.model_dump(exclude={"items"}, exclude_unset=True, mode="json")
    data.pop("cabinet_id", None)
    try:
        response = get_supabase().table("prescriptions").update(data).eq("id", prescription_id).eq("cabinet_id", current_user.cabinet_id).execute()
        if "items" in payload.model_fields_set:
            get_supabase().table("prescription_items").delete().eq("prescription_id", prescription_id).execute()
            if payload.items:
                items = [item.model_dump(mode="json") | {"prescription_id": prescription_id} for item in payload.items]
                get_supabase().table("prescription_items").insert(items).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer les données.") from exc
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return get_prescription(prescription_id, current_user)


@router.delete("/{prescription_id}")
def delete_prescription(prescription_id: str, current_user: AuthUser):
    _get_prescription(prescription_id, current_user.cabinet_id)
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
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer les données.") from exc
    return get_prescription(created["id"], current_user)


@router.post("/{prescription_id}/finalize")
def finalize_prescription(prescription_id: str, current_user: AuthUser):
    if current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")
    return update_prescription(prescription_id, PrescriptionIn(patient_id=_get_prescription(prescription_id, current_user.cabinet_id)["patient_id"], status="Finalisée"), current_user)


@router.post("/{prescription_id}/mark-sent")
def mark_sent(prescription_id: str, current_user: AuthUser):
    _get_prescription(prescription_id, current_user.cabinet_id)
    response = get_supabase().table("prescriptions").update({"status": "Envoyée", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", prescription_id).eq("cabinet_id", current_user.cabinet_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("/{prescription_id}/generate-pdf")
def generate_pdf(prescription_id: str, current_user: AuthUser):
    try:
        return _generate_prescription_pdf(prescription_id, current_user)
    except PdfGenerationError as exc:
        raise _pdf_engine_unavailable(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=PDF_GENERATION_ERROR) from exc


@router.get("/{prescription_id}/pdf-url")
def get_prescription_pdf_url(prescription_id: str, current_user: AuthUser):
    prescription = _get_prescription(prescription_id, current_user.cabinet_id)
    storage_path = storage_path_from_value(prescription.get("pdf_url"))
    if not storage_path:
        raise HTTPException(status_code=404, detail="Ressource introuvable.")
    if not storage_path.lower().endswith(".pdf"):
        try:
            prescription = _generate_prescription_pdf(prescription_id, current_user)
            storage_path = storage_path_from_value(prescription.get("pdf_url"))
        except PdfGenerationError as exc:
            raise _pdf_engine_unavailable(exc) from exc
        except Exception as exc:
            raise HTTPException(status_code=409, detail="PDF non disponible. Veuillez régénérer le document.") from exc
    if not storage_path or not storage_path.lower().endswith(".pdf"):
        raise HTTPException(status_code=409, detail="PDF non disponible. Veuillez régénérer le document.")
    try:
        return {"url": create_signed_document_url(storage_path, 300), "expires_in": 300}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Impossible de générer le PDF pour le moment.") from exc


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
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer les données.") from exc


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
