"""Persistent audit logging for administrative actions."""
import logging
import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from backend.auth import CurrentUser
from backend.supabase_client import get_supabase

logger = logging.getLogger(__name__)
_LOCAL_LOG_FILE = Path(__file__).resolve().parent / "activity_logs.json"
_LOCAL_LOG_LOCK = Lock()


def _read_local_logs() -> list[dict[str, Any]]:
    try:
        return json.loads(_LOCAL_LOG_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _write_local_log(log: dict[str, Any]) -> None:
    with _LOCAL_LOG_LOCK:
        logs = _read_local_logs()
        logs.insert(0, log)
        _LOCAL_LOG_FILE.write_text(json.dumps(logs[:100], indent=2), encoding="utf-8")


def record_activity(admin: CurrentUser, action: str, target: str, details: dict[str, Any] | None = None) -> None:
    """Write an audit row without allowing logging failures to break the action."""
    log = {
        "id": int(datetime.now(timezone.utc).timestamp() * 1000),
        "admin_email": admin.email,
        "action": action.upper(),
        "target": target,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        get_supabase().table("activity_logs").insert({
            "admin_email": admin.email,
            "action": log["action"],
            "target": target,
            "details": details or {},
        }).execute()
    except Exception:
        logger.warning("Supabase activity log unavailable; writing local audit record: %s %s", action, target)
        _write_local_log(log)


def get_activity_logs() -> list[dict[str, Any]]:
    """Read Supabase logs, falling back to persistent local logs when needed."""
    try:
        result = get_supabase().table("activity_logs").select("*").order("created_at", desc=True).limit(100).execute()
        if result.data:
            return result.data
    except Exception:
        pass
    return _read_local_logs()