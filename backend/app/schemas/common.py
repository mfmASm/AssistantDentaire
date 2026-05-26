from datetime import date, time
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")


class PatientIn(ApiModel):
    full_name: str = Field(min_length=1)
    phone: str | None = None
    email: str | None = None
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = None
    address: str | None = None
    status: str = "Actif"
    notes: str | None = None


class AppointmentIn(ApiModel):
    patient_id: UUID
    doctor_id: UUID | None = None
    appointment_date: date
    start_time: time
    end_time: time | None = None
    treatment_type: str | None = None
    status: str = "Confirmé"
    payment_status: str | None = None
    notes: str | None = None
    follow_up_status: str | None = None
    follow_up_note: str | None = None
    follow_up_updated_at: str | None = None


class AppointmentUpdate(ApiModel):
    patient_id: UUID | None = None
    doctor_id: UUID | None = None
    appointment_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    treatment_type: str | None = None
    status: str | None = None
    payment_status: str | None = None
    notes: str | None = None
    follow_up_status: str | None = None
    follow_up_note: str | None = None
    follow_up_updated_at: str | None = None


class PaymentIn(ApiModel):
    patient_id: UUID
    treatment: str | None = None
    total_amount: Decimal = Field(default=0, ge=0)
    paid_amount: Decimal = Field(default=0, ge=0)
    remaining_amount: Decimal | None = Field(default=None, ge=0)
    status: str = "Impayé"
    due_date: date | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_amounts(self):
        if self.paid_amount > self.total_amount:
            raise ValueError("paid_amount cannot exceed total_amount")
        return self

    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        data["remaining_amount"] = data["total_amount"] - data["paid_amount"]
        return data


class PaymentUpdate(ApiModel):
    patient_id: UUID | None = None
    treatment: str | None = None
    total_amount: Decimal | None = Field(default=None, ge=0)
    paid_amount: Decimal | None = Field(default=None, ge=0)
    remaining_amount: Decimal | None = Field(default=None, ge=0)
    status: str | None = None
    due_date: date | None = None
    notes: str | None = None


class RecallIn(ApiModel):
    patient_id: UUID
    recall_type: str | None = None
    last_visit_date: date | None = None
    next_recall_date: date
    status: str = "Prévu"
    notes: str | None = None


class ReviewIn(ApiModel):
    patient_id: UUID
    appointment_id: UUID | None = None
    status: str = "Non envoyé"


class PrescriptionItemIn(ApiModel):
    medication_name: str = Field(min_length=1)
    dosage: str | None = None
    frequency: str | None = None
    duration: str | None = None
    instructions: str | None = None


class PrescriptionIn(ApiModel):
    patient_id: UUID
    doctor_id: UUID | None = None
    reference: str | None = None
    prescription_date: date | None = None
    motif: str | None = None
    diagnosis_notes: str | None = None
    instructions: str | None = None
    status: str = "Brouillon"
    items: list[PrescriptionItemIn] = []


class FavoriteMedicationIn(ApiModel):
    name: str = Field(min_length=1)
    category: str | None = None
    default_dosage: str | None = None
    default_frequency: str | None = None
    default_duration: str | None = None
    default_instructions: str | None = None
    internal_notes: str | None = None


class CertificateIn(ApiModel):
    patient_id: UUID
    doctor_id: UUID | None = None
    reference: str | None = None
    certificate_date: date | None = None
    certificate_type: str | None = None
    motif: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    rest_duration: str | None = None
    observations: str | None = None
    internal_notes: str | None = None
    certificate_text: str | None = None
    status: str = "Brouillon"


class TemplateIn(ApiModel):
    type: str
    name: str = Field(min_length=1)
    description: str | None = None
    content: dict[str, Any] = {}
    is_default: bool = False


class WhatsAppLogIn(ApiModel):
    patient_id: UUID | None = None
    type: str | None = None
    message: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    status: str = "Préparé"


class SettingIn(ApiModel):
    value: dict[str, Any]
