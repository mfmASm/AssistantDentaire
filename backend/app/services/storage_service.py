from pathlib import Path
from urllib.parse import urlparse

from app.core.config import get_settings
from app.core.supabase import get_supabase


def upload_pdf(path: Path, storage_path: str) -> str:
    settings = get_settings()
    supabase = get_supabase()
    content = path.read_bytes()
    supabase.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path,
        content,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    return storage_path


def upload_pdf_bytes(content: bytes, storage_path: str) -> str:
    settings = get_settings()
    supabase = get_supabase()
    supabase.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path,
        content,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    return storage_path


def storage_path_from_value(value: str | None) -> str | None:
    if not value:
        return None
    settings = get_settings()
    parsed = urlparse(value)
    if not parsed.scheme:
        return value
    marker = f"/storage/v1/object/public/{settings.supabase_storage_bucket}/"
    if marker in parsed.path:
        return parsed.path.split(marker, 1)[1]
    marker = f"/storage/v1/object/sign/{settings.supabase_storage_bucket}/"
    if marker in parsed.path:
        return parsed.path.split(marker, 1)[1]
    return None


def create_signed_document_url(storage_path: str, expires_in: int = 300) -> str:
    settings = get_settings()
    result = (
        get_supabase()
        .storage
        .from_(settings.supabase_storage_bucket)
        .create_signed_url(storage_path, expires_in)
    )
    if isinstance(result, dict):
        signed_url = result.get("signedURL") or result.get("signed_url")
        if signed_url:
            return signed_url
    signed_url = getattr(result, "signed_url", None) or getattr(result, "signedURL", None)
    if signed_url:
        return signed_url
    raise RuntimeError("Unable to create signed URL")
