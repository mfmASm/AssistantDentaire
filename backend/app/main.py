from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    appointments,
    auth,
    cabinets,
    dashboard,
    favorite_medications,
    medical_certificates,
    patients,
    payments,
    prescriptions,
    recalls,
    reviews,
    settings as settings_routes,
    team,
    whatsapp_logs,
)
from app.core.config import get_settings

config = get_settings()

app = FastAPI(title="AssistantDentaire API", version="0.1.0")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

if config.FRONTEND_URL and config.FRONTEND_URL not in allowed_origins:
    allowed_origins.append(config.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/cors-test")
def cors_test():
    return {"cors": "ok"}


app.include_router(auth.router)
app.include_router(cabinets.router)
app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(payments.router)
app.include_router(recalls.router)
app.include_router(reviews.router)
app.include_router(prescriptions.router)
app.include_router(favorite_medications.router)
app.include_router(medical_certificates.router)
app.include_router(whatsapp_logs.router)
app.include_router(dashboard.router)
app.include_router(settings_routes.router)
app.include_router(team.router)
