"""
Auth dependencies for FastAPI routes.

Students and admins both authenticate via Supabase Auth on the frontend
(no more hardcoded email/password pairs like the legacy repo's auth.py).
The frontend sends the Supabase-issued access token as a Bearer header;
this module verifies it against the project's JWT secret and looks up
the corresponding row in public.users to determine role.

This replaces the legacy repo's auth.py entirely — that file signed its
own custom JWTs for two hardcoded accounts and is discarded, not reused.

--- LOCAL DEV BYPASS ---
Set DEV_BYPASS_AUTH=true in backend/.env to skip JWT verification and
assume a fixed admin identity. USE ONLY FOR LOCAL TESTING — never in
production/staging.
"""
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from .config import get_settings
from backend.supabase_client import get_supabase

logger = logging.getLogger(__name__)
settings = get_settings()

# DEV_BYPASS_AUTH is loaded from backend/.env via pydantic-settings (Settings class).
# os.getenv() cannot read .env files, so we always go through settings.
_DEV_BYPASS = settings.DEV_BYPASS_AUTH

bearer_scheme = HTTPBearer(auto_error=not _DEV_BYPASS)


class CurrentUser:
    def __init__(self, supabase_uid: str, email: str, role: str, db_id: int):
        self.supabase_uid = supabase_uid
        self.email = email
        self.role = role
        self.db_id = db_id


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    # ------------------------------------------------------------------ #
    # DEV BYPASS — local testing only, never enable in production          #
    # ------------------------------------------------------------------ #
    if _DEV_BYPASS:
        logger.warning(
            "DEV_BYPASS_AUTH is enabled — returning synthetic admin user. "
            "Disable this before deploying."
        )
        db = get_supabase()
        try:
            db.table("users").upsert({
                "supabase_uid": "00000000-0000-0000-0000-000000000000",
                "name": "Dev Bypass Admin",
                "email": "devbypass@localhost",
                "role": "admin",
                "department": "IT"
            }, on_conflict="supabase_uid").execute()
        except Exception as exc:
            logger.error("Failed to auto-upsert dev bypass user: %s", exc)

        return CurrentUser(
            supabase_uid="00000000-0000-0000-0000-000000000000",
            email="devbypass@localhost",
            role="admin",
            db_id=0,
        )

    if credentials is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "No Authorization header provided. "
            "Log in at /login to get a session token.",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as e:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            f"Invalid or expired token: {e}. Please log in again.",
        )

    supabase_uid = payload.get("sub")
    email = payload.get("email", "")
    if not supabase_uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject claim")

    db = get_supabase()
    result = (
        db.table("users")
        .select("id, role, email")
        .eq("supabase_uid", supabase_uid)
        .limit(1)
        .execute()
    )

    if not result.data:
        # The user authenticated successfully with Supabase Auth but has no
        # public.users profile row. This can happen when a user is created
        # directly via the Supabase dashboard rather than via the /login
        # sign-up flow. Auto-create a student profile so they can proceed.
        logger.warning(
            "No public.users row for supabase_uid=%s — auto-creating student profile.",
            supabase_uid,
        )
        try:
            insert_result = (
                db.table("users")
                .insert(
                    {
                        "supabase_uid": supabase_uid,
                        "name": email.split("@")[0] if email else "Unknown",
                        "email": email,
                        "role": "student",
                    }
                )
                .execute()
            )
            row = insert_result.data[0]
        except Exception as exc:
            logger.error("Failed to auto-create user profile: %s", exc)
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "No application profile found for this account. "
                "Please sign up at /login to complete registration.",
            )
    else:
        row = result.data[0]

    return CurrentUser(
        supabase_uid=supabase_uid,
        email=row["email"] or email,
        role=row["role"],
        db_id=row["id"],
    )


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in {"admin", "super_admin"}:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Admin privileges required. Your account role is '{user.role}'. "
            "To test upload-poster locally set DEV_BYPASS_AUTH=true in backend/.env, "
            "or update your user's role to 'admin' in the Supabase dashboard "
            "(Table Editor -> public.users -> set role='admin').",
        )
    return user


async def require_super_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if _DEV_BYPASS:
        return CurrentUser(user.supabase_uid, user.email, "super_admin", user.db_id)
    if user.role != "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super Admin privileges required.")
    return user


_optional_bearer = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
) -> CurrentUser | None:
    """
    Returns the CurrentUser if a valid Bearer token is present, otherwise
    returns None without raising an exception. Used by public endpoints.
    """
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        # Invalid/expired token — treat as anonymous guest
        return None
