from datetime import date, timedelta
import re

from fastapi import APIRouter, HTTPException

from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import CertificateIn
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
from app.utils.ownership import ensure_certificate_in_cabinet, ensure_patient_in_cabinet
from app.utils.references import make_reference

router = APIRouter(prefix="/medical-certificates", tags=["medical-certificates"])

ALLOWED_STATUSES = {"Brouillon", "Finalisé", "Envoyé", "Imprimé"}


def _pdf_engine_unavailable(exc: Exception):
    return HTTPException(
        status_code=503,
        detail={"code": PDF_ENGINE_UNAVAILABLE_CODE, "message": PDF_ENGINE_UNAVAILABLE_MESSAGE},
    )


def _validate_status(status: str | None, current_user: AuthUser):
    if status is None:
        return
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid certificate status")
    if status == "Finalisé" and current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")


def _get_certificate(certificate_id: str, cabinet_id: str):
    return ensure_certificate_in_cabinet(certificate_id, cabinet_id)


def _rest_duration_days(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\d+", value)
    if not match:
        return None
    return int(match.group(0))


def _generate_certificate_pdf(certificate_id: str, current_user: AuthUser):
    supabase = get_supabase()
    cert = _get_certificate(certificate_id, current_user.cabinet_id)
    patient = supabase.table("patients").select("*").eq("id", cert["patient_id"]).eq("cabinet_id", current_user.cabinet_id).single().execute().data
    cabinet = supabase.table("cabinets").select("*").eq("id", current_user.cabinet_id).single().execute().data
    body = (
        f"<p>{safe_multiline(cert.get('certificate_text') or cert.get('observations'))}</p>"
        f"<p>Motif: {safe_multiline(cert.get('motif'))}</p>"
        f"<p>Période: {safe_text(cert.get('start_date'))} - {safe_text(cert.get('end_date'))}</p>"
        f"<p>Type: {safe_text(cert.get('certificate_type'))}</p>"
        f"<p>Durée: {safe_text(cert.get('rest_duration'))}</p>"
    )
    storage_path = f"{current_user.cabinet_id}/medical-certificates/{certificate_id}.pdf"
    pdf_path = generate_document_pdf("Certificat médical", cabinet or {}, patient or {}, body, cert.get("reference") or certificate_id, storage_path)
    response = supabase.table("medical_certificates").update({"pdf_url": pdf_path}).eq("id", certificate_id).eq("cabinet_id", current_user.cabinet_id).execute()
    return response.data[0]


@router.get("")
def list_certificates(current_user: AuthUser):
    response = (
        get_supabase()
        .table("medical_certificates")
        .select("*")
        .eq("cabinet_id", current_user.cabinet_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.get("/{certificate_id}")
def get_certificate(certificate_id: str, current_user: AuthUser):
    return _get_certificate(certificate_id, current_user.cabinet_id)


@router.post("")
def create_certificate(payload: CertificateIn, current_user: AuthUser):
    _validate_status(payload.status, current_user)
    ensure_patient_in_cabinet(payload.patient_id, current_user.cabinet_id)
    data = payload.model_dump(exclude_unset=True, mode="json")
    data["cabinet_id"] = current_user.cabinet_id
    data["doctor_id"] = current_user.id
    data.setdefault("reference", make_reference("CERT"))
    try:
        response = get_supabase().table("medical_certificates").insert(data).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer les données.") from exc
    return response.data[0] if response.data else None


@router.put("/{certificate_id}")
def update_certificate(certificate_id: str, payload: CertificateIn, current_user: AuthUser):
    _validate_status(payload.status, current_user)
    _get_certificate(certificate_id, current_user.cabinet_id)
    ensure_patient_in_cabinet(payload.patient_id, current_user.cabinet_id)
    data = payload.model_dump(exclude_unset=True, mode="json")
    data.pop("cabinet_id", None)
    if "doctor_id" in data:
        data.pop("doctor_id", None)
    try:
        response = (
            get_supabase()
            .table("medical_certificates")
            .update(data)
            .eq("id", certificate_id)
            .eq("cabinet_id", current_user.cabinet_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer les données.") from exc
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.delete("/{certificate_id}")
def delete_certificate(certificate_id: str, current_user: AuthUser):
    _get_certificate(certificate_id, current_user.cabinet_id)
    response = (
        get_supabase()
        .table("medical_certificates")
        .delete()
        .eq("id", certificate_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


@router.post("/{certificate_id}/duplicate")
def duplicate_certificate(certificate_id: str, current_user: AuthUser):
    original = _get_certificate(certificate_id, current_user.cabinet_id)
    today = date.today()
    start_date = today.isoformat() if original.get("start_date") else None
    duration_days = _rest_duration_days(original.get("rest_duration"))
    end_date = original.get("end_date")
    if start_date and duration_days:
        end_date = (today + timedelta(days=max(duration_days - 1, 0))).isoformat()

    cert = {
        "cabinet_id": current_user.cabinet_id,
        "doctor_id": current_user.id,
        "patient_id": original.get("patient_id"),
        "reference": make_reference("CERT"),
        "certificate_date": today.isoformat(),
        "certificate_type": original.get("certificate_type"),
        "motif": original.get("motif"),
        "start_date": start_date,
        "end_date": end_date,
        "rest_duration": original.get("rest_duration"),
        "observations": original.get("observations"),
        "internal_notes": original.get("internal_notes"),
        "certificate_text": original.get("certificate_text"),
        "status": "Brouillon",
        "pdf_url": None,
    }
    try:
        response = get_supabase().table("medical_certificates").insert(cert).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer les données.") from exc
    return response.data[0]


@router.post("/{certificate_id}/finalize")
def finalize_certificate(certificate_id: str, current_user: AuthUser):
    if current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")
    return update_certificate(certificate_id, CertificateIn(patient_id=_get_certificate(certificate_id, current_user.cabinet_id)["patient_id"], status="Finalisé"), current_user)


@router.post("/{certificate_id}/mark-sent")
def mark_certificate_sent(certificate_id: str, current_user: AuthUser):
    _get_certificate(certificate_id, current_user.cabinet_id)
    response = (
        get_supabase()
        .table("medical_certificates")
        .update({"status": "Envoyé"})
        .eq("id", certificate_id)
        .eq("cabinet_id", current_user.cabinet_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("/{certificate_id}/generate-pdf")
def generate_certificate_pdf(certificate_id: str, current_user: AuthUser):
    try:
        return _generate_certificate_pdf(certificate_id, current_user)
    except PdfGenerationError as exc:
        raise _pdf_engine_unavailable(exc) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=PDF_GENERATION_ERROR) from exc


@router.get("/{certificate_id}/pdf-url")
def get_certificate_pdf_url(certificate_id: str, current_user: AuthUser):
    cert = _get_certificate(certificate_id, current_user.cabinet_id)
    storage_path = storage_path_from_value(cert.get("pdf_url"))
    if not storage_path:
        raise HTTPException(status_code=404, detail="Ressource introuvable.")
    if not storage_path.lower().endswith(".pdf"):
        try:
            cert = _generate_certificate_pdf(certificate_id, current_user)
            storage_path = storage_path_from_value(cert.get("pdf_url"))
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
