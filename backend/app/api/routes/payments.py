from app.api.routes.crud import create_crud_router
from app.schemas.common import PaymentIn

router = create_crud_router("payments", PaymentIn, "/payments", ["payments"])
