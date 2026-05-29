from datetime import date
from html import escape

from app.services.storage_service import upload_pdf_bytes


def _document_html(title: str, cabinet: dict, patient: dict, body: str, reference: str) -> str:
    return f"""
    <!doctype html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <style>
        @page {{ size: A4; margin: 18mm; }}
        body {{ font-family: Arial, sans-serif; color: #17202a; font-size: 12px; }}
        header {{ border-bottom: 2px solid #0f766e; padding-bottom: 14px; margin-bottom: 20px; }}
        h1 {{ color: #0f766e; font-size: 22px; margin: 0 0 6px; }}
        h2 {{ font-size: 18px; margin: 24px 0 12px; text-align: center; }}
        .muted {{ color: #5b6770; }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
        .card {{ border: 1px solid #d8e2e7; border-radius: 8px; padding: 12px; background: #f8fbfb; }}
        .content {{ min-height: 420px; line-height: 1.7; }}
        .signature {{ display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; }}
        .box {{ height: 90px; border: 1px dashed #96a3ad; border-radius: 8px; padding: 10px; color: #5b6770; }}
        footer {{ border-top: 1px solid #d8e2e7; margin-top: 28px; padding-top: 10px; font-size: 10px; color: #5b6770; text-align: center; }}
      </style>
    </head>
    <body>
      <header>
        <h1>{escape(cabinet.get("name") or "Cabinet dentaire")}</h1>
        <div>{escape(cabinet.get("dentist_name") or "")}</div>
        <div class="muted">{escape(cabinet.get("address") or "")} {escape(cabinet.get("city") or "")} · {escape(cabinet.get("phone") or "")}</div>
      </header>
      <div class="grid">
        <div class="card"><strong>Patient</strong><br />{escape(patient.get("full_name") or "")}<br />{escape(patient.get("phone") or "")}</div>
        <div class="card"><strong>Référence</strong><br />{escape(reference)}<br />Date: {date.today():%d/%m/%Y}</div>
      </div>
      <h2>{escape(title)}</h2>
      <main class="content">{body}</main>
      <section class="signature">
        <div class="box">Signature du praticien</div>
        <div class="box">Cachet du cabinet</div>
      </section>
      <footer>Document généré par DentalPilot. Validation médicale sous la responsabilité du dentiste.</footer>
    </body>
    </html>
    """


def generate_document_pdf(title: str, cabinet: dict, patient: dict, body: str, reference: str, storage_path: str) -> str:
    html = _document_html(title, cabinet, patient, body, reference)
    try:
        from weasyprint import HTML
    except Exception:  # pragma: no cover
        # Keeps the service boundary usable in environments without native WeasyPrint dependencies.
        return upload_pdf_bytes(html.encode("utf-8"), storage_path.replace(".pdf", ".html"))
    pdf = HTML(string=html).write_pdf()
    return upload_pdf_bytes(pdf, storage_path)
