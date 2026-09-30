"""
Public Events API — list, search, and admin-delete events.

GET  /api/events           — Public. Returns all verified events with optional filtering.
DELETE /api/events/{id}    — Admin-only. Removes an event and its embeddings.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from backend.auth import CurrentUser, require_admin
from backend.supabase_client import get_supabase
from backend.audit import record_activity
from backend.audit import get_activity_logs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["events"])


class EventUpdateRequest(BaseModel):
    title: str
    department: str | None = None
    venue: str
    event_date: str
    end_date: str | None = None
    capacity: int | None = None
    description: str | None = None
    category: str | None = None
    tags: str | None = None


@router.get("/activity-logs", status_code=status.HTTP_200_OK)
async def list_activity_logs(
    admin: CurrentUser = Depends(require_admin),
):
    """Return the latest admin actions for the live activity feed."""
    return get_activity_logs()


@router.get("/events", status_code=status.HTTP_200_OK)
async def list_events(
    search: Optional[str] = Query(None, description="Search title or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """
    Public endpoint — no authentication required.
    Returns all verified events, ordered by event_date ascending.
    Supports optional search (title/description ilike) and category filter.
    """
    db = get_supabase()

    query = db.table("events").select("*").eq("is_verified", True)

    if category:
        query = query.ilike("category", f"%{category}%")

    query = query.order("event_date", desc=False)
    result = query.execute()

    rows = result.data or []

    # Client-side text search (Supabase JS doesn't have full-text OR across columns)
    if search:
        term = search.lower()
        rows = [
            r for r in rows
            if term in (r.get("title") or "").lower()
            or term in (r.get("description") or "").lower()
            or term in (r.get("department") or "").lower()
            or term in (r.get("tags") or "").lower()
        ]

    return rows


@router.put("/events/{event_id}", status_code=status.HTTP_200_OK)
async def update_event(
    event_id: int,
    payload: EventUpdateRequest,
    admin: CurrentUser = Depends(require_admin),
):
    """Admin-only update for a human-corrected event record."""
    db = get_supabase()
    existing = db.table("events").select("id").eq("id", event_id).execute()
    if not existing.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Event {event_id} not found.")

    result = (
        db.table("events")
        .update({
            "title": payload.title,
            "department": payload.department or None,
            "venue": payload.venue,
            "event_date": payload.event_date,
            "end_date": payload.end_date or None,
            "capacity": payload.capacity or 100,
            "description": payload.description or None,
            "category": payload.category or None,
            "tags": payload.tags or None,
            "is_verified": True,
        })
        .eq("id", event_id)
        .execute()
    )
    record_activity(admin, "update", f"Event ID: {event_id} ({payload.title})", {"event_id": event_id})
    return {"status": "updated", "event": result.data[0] if result.data else None}


@router.delete("/events/{event_id}", status_code=status.HTTP_200_OK)
async def delete_event(
    event_id: int,
    admin: CurrentUser = Depends(require_admin),
):
    """
    Admin-only. Deletes the event and its associated embeddings.
    """
    db = get_supabase()

    # Check the event exists
    check = db.table("events").select("id, title").eq("id", event_id).execute()
    if not check.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Event {event_id} not found.")

    title = check.data[0].get("title", "Unknown")

    # Delete embeddings first (foreign key child)
    try:
        db.table("event_embeddings").delete().eq("event_id", event_id).execute()
    except Exception as e:
        logger.warning("Failed to delete embeddings for event %s: %s", event_id, e)

    # Delete the event
    db.table("events").delete().eq("id", event_id).execute()

    record_activity(admin, "delete", f"Event ID: {event_id} ({title})", {"event_id": event_id})

    logger.info("Admin %s deleted event %s ('%s')", admin.email, event_id, title)

    return {
        "status": "deleted",
        "message": f"Event '{title}' (id={event_id}) has been removed.",
        "event_id": event_id,
    }
