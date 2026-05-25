from app.utils.phone import make_wa_me_url


PDF_ATTACHMENT_REMINDER = "Veuillez joindre le PDF téléchargé dans WhatsApp avant l’envoi."


def build_whatsapp_response(phone: str, message: str, document_type: str | None = None) -> dict:
    payload = {"wa_me_url": make_wa_me_url(phone, message)}
    if document_type in {"prescription", "certificate"}:
        payload["attachment_reminder"] = PDF_ATTACHMENT_REMINDER
    return payload
