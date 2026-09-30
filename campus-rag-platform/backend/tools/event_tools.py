"""
Tool functions bound to the LangGraph agent (Task 3.3). Each function is
a plain, typed async Python function with a docstring the LLM uses to
decide when/how to call it.
"""
import logging
from datetime import datetime

from backend.supabase_client import get_supabase
from backend.tools import vector_store

logger = logging.getLogger(__name__)


async def search_campus_events(query: str) -> dict:
    """Semantic search over verified campus events using the vector store.
    Use this whenever the user asks about events, topics, departments, or
    anything that isn't a direct registration/conflict/venue lookup."""
    matches = await vector_store.search_events(query)
    if not matches:
        return {"found": False, "events": []}

    return {
        "found": True,
        "events": [
            {
                "event_id": m["event"]["id"],
                "title": m["event"]["title"],
                "department": m["event"].get("department"),
                "venue": m["event"]["venue"],
                "event_date": m["event"]["event_date"],
                "description": m["event"].get("description"),
                "similarity": round(m["similarity"], 3),
            }
            for m in matches
        ],
    }


async def register_user_for_event(user_email: str, event_title: str) -> dict:
    """Register a student for an event by title. Looks up the user by
    email and the event by fuzzy title match, then inserts a registration
    row (subject to the RLS policy: user_id must equal auth.uid(), but
    since this call runs through the service-role backend client, the
    caller's identity is validated at the API layer before this tool
    ever executes — see backend/main.py's /api/chat route)."""
    db = get_supabase()

    user_result = db.table("users").select("id, supabase_uid").eq("email", user_email).limit(1).execute()
    if not user_result.data:
        return {"success": False, "message": f"No user found with email {user_email}."}
    user_row = user_result.data[0]

    event_result = (
        db.table("events")
        .select("id, title, capacity")
        .ilike("title", f"%{event_title}%")
        .eq("is_verified", True)
        .limit(1)
        .execute()
    )
    if not event_result.data:
        return {"success": False, "message": f"No verified event matching '{event_title}' found."}
    event_row = event_result.data[0]

    count_result = db.table("registrations").select("id", count="exact").eq("event_id", event_row["id"]).execute()
    current_count = count_result.count or 0
    if event_row.get("capacity") and current_count >= event_row["capacity"]:
        return {"success": False, "message": f"'{event_row['title']}' is already at full capacity."}

    try:
        db.table("registrations").insert(
            {"user_id": user_row["supabase_uid"], "event_id": event_row["id"]}
        ).execute()
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            return {"success": True, "message": f"You're already registered for '{event_row['title']}'."}
        logger.error("Registration insert failed: %s", e)
        return {"success": False, "message": "Registration failed due to a database error."}

    return {"success": True, "message": f"Registered for '{event_row['title']}'.", "event_id": event_row["id"]}


async def get_venue_coordinates(venue_name: str) -> dict:
    """Retrieve GPS coordinates for a campus venue, for map rendering."""
    db = get_supabase()
    result = (
        db.table("events")
        .select("venue, latitude, longitude")
        .ilike("venue", f"%{venue_name}%")
        .not_.is_("latitude", "null")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return {"found": False}

    row = result.data[0]
    return {"found": True, "venue": row["venue"], "latitude": row["latitude"], "longitude": row["longitude"]}


async def check_schedule_conflicts(venue: str, date: str) -> dict:
    """Check whether a venue already has a verified event booked that
    overlaps the given date/time."""
    db = get_supabase()
    result = (
        db.table("events")
        .select("id, title, event_date, end_date")
        .ilike("venue", f"%{venue}%")
        .eq("is_verified", True)
        .execute()
    )
    conflicts = []
    try:
        target = datetime.fromisoformat(date)
    except (TypeError, ValueError):
        target = None

    for row in result.data or []:
        if target is None:
            conflicts.append(row)
            continue
        try:
            start = datetime.fromisoformat(row["event_date"])
            end = datetime.fromisoformat(row["end_date"]) if row.get("end_date") else start
            if start <= target <= end:
                conflicts.append(row)
        except (TypeError, ValueError):
            continue

    return {"has_conflict": len(conflicts) > 0, "conflicting_events": conflicts}
