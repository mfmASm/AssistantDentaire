from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status

from app.core.config import get_settings
from app.core.supabase import get_supabase


@dataclass
class CurrentUser:
    id: str
    email: str | None
    role: str
    cabinet_id: str


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return token


def get_current_user(request: Request) -> CurrentUser:
    token = _bearer_token(request)
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    response = get_supabase().table("profiles").select("*").eq("id", user_id).single().execute()
    profile = response.data
    if not profile or not profile.get("cabinet_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profile or cabinet not found")

    return CurrentUser(
        id=user_id,
        email=profile.get("email") or payload.get("email"),
        role=profile.get("role", "doctor"),
        cabinet_id=profile["cabinet_id"],
    )


AuthUser = Annotated[CurrentUser, Depends(get_current_user)]
