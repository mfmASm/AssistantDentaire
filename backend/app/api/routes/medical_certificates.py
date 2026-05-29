from datetime import date

from fastapi import APIRouter, HTTPException

from app.api.routes.crud import _supabase_error_detail
from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import CertificateIn
from app.services.pdf_service import generate_document_pdf
from app.utils.references import make_reference

router = APIRouter(prefix="/medical-certificates", tags=["medical-certificates"])

ALLOWED_STATUSES = {"Brouillon", "Finalisé", "Envoyé", "Imprimé"}


def _validate_status(status: str | None, current_user: AuthUser):
    if status is None:
        return
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid certificate status")
    if status == "Finalisé" and current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")


def _get_certificate(certificate_id: str, cabinet_id: str):
    response = (
        get_supabase()
        .table("medical_certificates")
        .select("*")
        .eq("id", certificate_id)
        .eq("cabinet_id", cabinet_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data


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
    data = payload.model_dump(exclude_unset=True, mode="json")
    data["cabinet_id"] = current_user.cabinet_id
    data["doctor_id"] = current_user.id
    data.setdefault("reference", make_reference("CERT"))
    try:
        response = get_supabase().table("medical_certificates").insert(data).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    return response.data[0] if response.data else None


@router.put("/{certificate_id}")
def update_certificate(certificate_id: str, payload: CertificateIn, current_user: AuthUser):
    _validate_status(payload.status, current_user)
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
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.delete("/{certificate_id}")
def delete_certificate(certificate_id: str, current_user: AuthUser):
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
    cert = _get_certificate(certificate_id, current_user.cabinet_id)
    for key in ("id", "created_at", "updated_at", "pdf_url"):
        cert.pop(key, None)
    cert["reference"] = make_reference("CERT")
    cert["status"] = "Brouillon"
    cert["certificate_date"] = date.today().isoformat()
    cert["doctor_id"] = current_user.id
    try:
        response = get_supabase().table("medical_certificates").insert(cert).execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=_supabase_error_detail(exc)) from exc
    return response.data[0]


@router.post("/{certificate_id}/finalize")
def finalize_certificate(certificate_id: str, current_user: AuthUser):
    if current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")
    return update_certificate(certificate_id, CertificateIn(patient_id=_get_certificate(certificate_id, current_user.cabinet_id)["patient_id"], status="Finalisé"), current_user)


@router.post("/{certificate_id}/mark-sent")
def mark_certificate_sent(certificate_id: str, current_user: AuthUser):
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
    supabase = get_supabase()
    cert = _get_certificate(certificate_id, current_user.cabinet_id)
    patient = supabase.table("patients").select("*").eq("id", cert["patient_id"]).eq("cabinet_id", current_user.cabinet_id).single().execute().data
    cabinet = supabase.table("cabinets").select("*").eq("id", current_user.cabinet_id).single().execute().data
    body = f"<p>{cert.get('certificate_text') or cert.get('observations') or ''}</p><p>Motif: {cert.get('motif') or ''}</p><p>Période: {cert.get('start_date') or ''} - {cert.get('end_date') or ''}</p>"
    pdf_url = generate_document_pdf("Certificat médical", cabinet or {}, patient or {}, body, cert.get("reference") or certificate_id, f"{current_user.cabinet_id}/certificates/{certificate_id}.pdf")
    return supabase.table("medical_certificates").update({"pdf_url": pdf_url}).eq("id", certificate_id).eq("cabinet_id", current_user.cabinet_id).execute().data[0]
