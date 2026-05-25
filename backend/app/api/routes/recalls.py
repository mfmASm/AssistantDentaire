from app.api.routes.crud import create_crud_router
from app.schemas.common import RecallIn

router = create_crud_router("recalls", RecallIn, "/recalls", ["recalls"])
