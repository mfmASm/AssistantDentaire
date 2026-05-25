from app.api.routes.crud import create_crud_router
from app.schemas.common import PatientIn

router = create_crud_router("patients", PatientIn, "/patients", ["patients"])
