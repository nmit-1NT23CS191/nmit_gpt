"""Supabase password login with database-backed role validation."""
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from backend.config import get_settings
from backend.supabase_client import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["admin", "super-admin"]


@router.post("/login")
async def login(payload: LoginRequest):
    if settings.DEV_BYPASS_AUTH:
        local_accounts = {
            "admin@nmit.edu": ("admin", "System Admin"),
            "superadmin@nmit.edu": ("super_admin", "Super Admin"),
        }
        account = local_accounts.get(str(payload.email).lower())
        requested_role = "super_admin" if payload.role == "super-admin" else "admin"
        if account and payload.password == "admin123" and account[0] == requested_role:
            return {
                "access_token": "local-dev-token",
                "refresh_token": "local-dev-refresh-token",
                "user": {
                    "id": 0,
                    "name": account[1],
                    "email": str(payload.email),
                    "role": account[0],
                },
            }

    try:
        auth_response = get_supabase().auth.sign_in_with_password({
            "email": str(payload.email),
            "password": payload.password,
        })
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.") from exc

    auth_user = auth_response.user
    session = auth_response.session
    if not auth_user or not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")

    profile = get_supabase().table("users").select("id, name, email, role").eq("supabase_uid", auth_user.id).limit(1).execute()
    if not profile.data:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has no application profile.")

    user = profile.data[0]
    actual_role = user.get("role")
    requested_role = "super_admin" if payload.role == "super-admin" else "admin"
    if actual_role != requested_role:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not authorized for the selected login type.")

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user": {"id": user["id"], "name": user.get("name"), "email": user.get("email"), "role": actual_role},
    }