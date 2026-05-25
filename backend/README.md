# DentalPilot Backend

FastAPI backend for DentalPilot using Supabase PostgreSQL, Supabase Auth, and Supabase Storage.

## Local Dev

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On Windows PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Copy `.env.example` to `.env` and fill Supabase values. Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only.

## Supabase

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor. It creates tenant tables, indexes, RLS policies, and demo data for `Cabinet Atlas — Casablanca`.

Every business route uses the authenticated user's `profiles.cabinet_id`; `cabinet_id` from the frontend is ignored.

## PDF

`app/services/pdf_service.py` renders professional A4 HTML documents and uploads generated files to Supabase Storage bucket `dental-documents`. If WeasyPrint native dependencies are unavailable, the service boundary remains in place and uploads the generated HTML fallback.

## Medical Safety

DentalPilot stores dentist-edited presets and templates only. It does not automatically recommend diagnoses, medications, dosages, or rest durations. Final prescription and certificate validation is restricted to `admin` and `doctor` roles.
