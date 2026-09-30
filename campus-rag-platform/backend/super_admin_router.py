"""Privileged Super Admin operations. Service-role access stays server-side."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from backend.audit import get_activity_logs, record_activity
from backend.auth import CurrentUser, require_super_admin
from backend.supabase_client import get_supabase

router = APIRouter(prefix="/api/super-admin", tags=["super-admin"])


@router.get("/logs")
async def super_admin_logs(admin: CurrentUser = Depends(require_super_admin)):
    return get_activity_logs()


class CreateAdminRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


@router.post("/admins", status_code=status.HTTP_201_CREATED)
async def create_admin(payload: CreateAdminRequest, admin: CurrentUser = Depends(require_super_admin)):
    if len(payload.password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must contain at least 8 characters.")
    db = get_supabase()
    try:
        created = db.auth.admin.create_user({
            "email": str(payload.email),
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"name": payload.name},
        })
        auth_user = created.user
        db.table("users").insert({
            "supabase_uid": auth_user.id,
            "name": payload.name.strip(),
            "email": str(payload.email),
            "role": "admin",
        }).execute()
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Could not create admin account: {exc}") from exc

    record_activity(admin, "admin_account_created", f"Admin: {payload.email}", {"email": str(payload.email), "name": payload.name})
    return {"status": "created", "email": str(payload.email), "user_id": auth_user.id}