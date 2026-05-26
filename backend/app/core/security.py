from dataclasses import dataclass
import json
import logging
from typing import Annotated
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen

from fastapi import Depends, HTTPException, Request, status

from app.core.config import get_settings
from app.core.supabase import get_supabase

logger = logging.getLogger("dentalpilot.auth")


@dataclass
class AuthenticatedUser:
    id: str
    email: str | None


@dataclass
class CurrentUser:
    id: str
    email: str | None
    full_name: str | None
    role: str
    cabinet_id: str
    profile: dict
    cabinet: dict | None


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    logger.info("Auth token received: %s", "yes" if token else "no")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return token


def get_authenticated_user(request: Request) -> AuthenticatedUser:
    user = verify_supabase_token(_bearer_token(request))
    return AuthenticatedUser(id=user["id"], email=user.get("email"))


def verify_supabase_token(token: str) -> dict:
    settings = get_settings()
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    request = UrlRequest(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": settings.supabase_anon_key,
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8")
            user = json.loads(body)
    except HTTPError as exc:
        logger.warning("Supabase user verification failed: status=%s", exc.code)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("Supabase user verification failed: %s", exc.__class__.__name__)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user_id = user.get("id")
    if not user_id:
        logger.warning("Supabase user verification failed: missing user id")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    logger.info("Supabase user verification success: user_id=%s", user_id)
    return user


def get_current_user(request: Request) -> CurrentUser:
    authenticated_user = get_authenticated_user(request)
    try:
        response = get_supabase().table("profiles").select("*").eq("id", authenticated_user.id).single().execute()
        profile = response.data
    except Exception:
        profile = None
    if not profile or not profile.get("cabinet_id"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile or cabinet not found. Call /auth/onboard.")

    try:
        cabinet = (
            get_supabase()
            .table("cabinets")
            .select("*")
            .eq("id", profile["cabinet_id"])
            .single()
            .execute()
            .data
        )
    except Exception:
        cabinet = None

    return CurrentUser(
        id=authenticated_user.id,
        email=profile.get("email") or authenticated_user.email,
        full_name=profile.get("full_name"),
        role=profile.get("role", "doctor"),
        cabinet_id=profile["cabinet_id"],
        profile=profile,
        cabinet=cabinet,
    )


AuthenticatedAuthUser = Annotated[AuthenticatedUser, Depends(get_authenticated_user)]
AuthUser = Annotated[CurrentUser, Depends(get_current_user)]
