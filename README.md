# DentalPilot

Project structure:

```text
backend/   FastAPI + Supabase API, SQL schema, services
frontend/  Existing React/Vite/Tailwind app
```

The frontend app content and visual design are kept unchanged. Backend connectivity is added through a service layer under `frontend/src/services`.

## Run Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Update README.md with simple run instructions only.

Do not change any app code.
Only edit README.md.

Add a section called:

## How to run the app locally

Explain that I need two terminals:

Terminal 1 — Backend:

cd backend
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Backend runs on:
http://localhost:8000

Test backend:
http://localhost:8000/health

Expected:
{"status":"ok"}

Terminal 2 — Frontend:

cd frontend
npm install
npm run dev

Frontend runs on the URL shown in the terminal, usually:
http://localhost:8080

Also add:

## Environment files

Backend needs:
backend/.env

Frontend needs:
frontend/.env

Do not commit real .env files.

Also add:

## Demo mode

To activate demo mode:
Paramètres → Mode démo → Activer le mode démo

To deactivate:
Paramètres → Mode démo → Désactiver

Demo mode is only for screenshots and presentations. It does not save fake data to Supabase.

Also add:

## Common issues

If login/API does not work:
- make sure backend is running
- open http://localhost:8000/health

If uvicorn is not recognized:
use python -m uvicorn instead of uvicorn

If port 8000 is busy:
netstat -ano | findstr :8000
taskkill /PID YOUR_PID /F

Keep it short, clean, and beginner-friendly.