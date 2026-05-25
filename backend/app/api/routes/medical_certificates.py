from fastapi import APIRouter, HTTPException

from app.api.routes.crud import create_crud_router
from app.core.security import AuthUser
from app.core.supabase import get_supabase
from app.schemas.common import CertificateIn
from app.services.pdf_service import generate_document_pdf
from app.utils.references import make_reference

router = create_crud_router("medical_certificates", CertificateIn, "/medical-certificates", ["medical-certificates"])


@router.post("/{certificate_id}/duplicate")
def duplicate_certificate(certificate_id: str, current_user: AuthUser):
    cert = get_supabase().table("medical_certificates").select("*").eq("id", certificate_id).eq("cabinet_id", current_user.cabinet_id).single().execute().data
    if not cert:
        raise HTTPException(status_code=404, detail="Not found")
    for key in ("id", "created_at", "updated_at", "pdf_url"):
        cert.pop(key, None)
    cert["reference"] = make_reference("CERT")
    cert["status"] = "Brouillon"
    return get_supabase().table("medical_certificates").insert(cert).execute().data[0]


@router.post("/{certificate_id}/finalize")
def finalize_certificate(certificate_id: str, current_user: AuthUser):
    if current_user.role not in {"admin", "doctor"}:
        raise HTTPException(status_code=403, detail="Only a dentist can finalize this document")
    response = get_supabase().table("medical_certificates").update({"status": "Validé"}).eq("id", certificate_id).eq("cabinet_id", current_user.cabinet_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("/{certificate_id}/mark-sent")
def mark_certificate_sent(certificate_id: str, current_user: AuthUser):
    response = get_supabase().table("medical_certificates").update({"status": "Envoyé"}).eq("id", certificate_id).eq("cabinet_id", current_user.cabinet_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Not found")
    return response.data[0]


@router.post("/{certificate_id}/generate-pdf")
def generate_certificate_pdf(certificate_id: str, current_user: AuthUser):
    supabase = get_supabase()
    cert = supabase.table("medical_certificates").select("*").eq("id", certificate_id).eq("cabinet_id", current_user.cabinet_id).single().execute().data
    if not cert:
        raise HTTPException(status_code=404, detail="Not found")
    patient = supabase.table("patients").select("*").eq("id", cert["patient_id"]).eq("cabinet_id", current_user.cabinet_id).single().execute().data
    cabinet = supabase.table("cabinets").select("*").eq("id", current_user.cabinet_id).single().execute().data
    body = f"<p>{cert.get('certificate_text') or cert.get('observations') or ''}</p><p>Motif: {cert.get('motif') or ''}</p><p>Période: {cert.get('start_date') or ''} - {cert.get('end_date') or ''}</p>"
    pdf_url = generate_document_pdf("Certificat médical", cabinet or {}, patient or {}, body, cert.get("reference") or certificate_id, f"{current_user.cabinet_id}/certificates/{certificate_id}.pdf")
    return supabase.table("medical_certificates").update({"pdf_url": pdf_url}).eq("id", certificate_id).eq("cabinet_id", current_user.cabinet_id).execute().data[0]
