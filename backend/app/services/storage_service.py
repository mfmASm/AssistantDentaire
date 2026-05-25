import base64
from pathlib import Path

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
    result = supabase.storage.from_(settings.supabase_storage_bucket).get_public_url(storage_path)
    return result


def upload_pdf_bytes(content: bytes, storage_path: str) -> str:
    settings = get_settings()
    supabase = get_supabase()
    supabase.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path,
        content,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    return supabase.storage.from_(settings.supabase_storage_bucket).get_public_url(storage_path)
