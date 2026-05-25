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
    settings,
    whatsapp_logs,
)
from app.core.config import get_settings

settings_obj = get_settings()

app = FastAPI(title="DentalPilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        settings_obj.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


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
app.include_router(settings.router)
