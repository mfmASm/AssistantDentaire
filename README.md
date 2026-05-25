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
