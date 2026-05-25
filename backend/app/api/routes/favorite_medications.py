from app.api.routes.crud import create_crud_router
from app.schemas.common import FavoriteMedicationIn

router = create_crud_router("favorite_medications", FavoriteMedicationIn, "/favorite-medications", ["favorite-medications"])
