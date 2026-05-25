from app.api.routes.crud import create_crud_router
from app.schemas.common import AppointmentIn

router = create_crud_router("appointments", AppointmentIn, "/appointments", ["appointments"])
