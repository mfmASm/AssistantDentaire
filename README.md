# DentalPilot

Private dental practice management app with a FastAPI backend and React/Vite frontend.

## How to run the app locally

Use two terminals.

Terminal 1 - Backend:

```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs on:

```text
http://localhost:8000
```

Test backend:

```text
http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

Terminal 2 - Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on the URL shown in the terminal, usually:

```text
http://localhost:8080
```

## Environment files

Backend needs `backend/.env`.

Required backend variables:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=dental-documents
FRONTEND_URL=http://localhost:8080
```

Frontend needs `frontend/.env`.

Required frontend variables:

```text
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit real `.env` files. `SUPABASE_SERVICE_ROLE_KEY` is backend-only and must never be used by the frontend.

## Production notes

Set `FRONTEND_URL` on backend hosting to the production frontend domain, for example:

```text
FRONTEND_URL=https://your-production-frontend-domain.com
```

The backend CORS allowlist includes local development origins plus `FRONTEND_URL`; do not use wildcard origins in production.

For production Supabase Storage, keep the `dental-documents` bucket private. Medical documents are stored as object paths and opened through short-lived signed URLs from the backend.

Frontend hosting needs:

```text
VITE_API_URL=https://your-production-backend-domain.com
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Demo mode

To activate demo mode:

```text
Paramètres -> Mode démo -> Activer le mode démo
```

To deactivate:

```text
Paramètres -> Mode démo -> Désactiver
```

Demo mode is frontend-only, stored in localStorage, and intended for screenshots and presentations. It does not save fake data to Supabase.

## Common issues

If login or API calls do not work:

- make sure the backend is running
- open `http://localhost:8000/health`

If `uvicorn` is not recognized:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If port `8000` is busy:

```bat
netstat -ano | findstr :8000
taskkill /PID YOUR_PID /F
```
Vercel deployment refresh.
