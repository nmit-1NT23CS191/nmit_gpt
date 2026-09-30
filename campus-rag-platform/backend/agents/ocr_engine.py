"""
OCR Ingestion & Event Publishing — two-phase human-in-the-loop workflow.

Phase 1 — POST /api/upload-poster  (admin only)
  1. Upload raw file to Supabase Storage.
  2. Run local OCR (Tesseract/Poppler) to extract text.
  3. Structure raw text into event fields via local Ollama LLM.
  4. Return the extracted draft as JSON — NO database write yet.
     The admin reviews and edits the fields in the UI before publishing.

Phase 2 — POST /api/events/publish  (admin only)
  1. Accept the admin-reviewed & corrected event fields.
  2. Run conflict detection against existing verified events.
  3. If no conflict: insert into `events`, store embeddings for RAG.
  4. Return the created event_id.

This two-phase design replaces the old single-shot endpoint that saved
directly to the DB on upload, which gave no opportunity to correct OCR
errors before a bad record entered the catalog.
"""
import logging
import os
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.auth import CurrentUser, require_admin
from ..config import get_settings
from ..documents import docx_processor, extractor, image_processor, pdf_processor
from ..supabase_client import get_supabase
from ..tools import vector_store
from backend.audit import record_activity

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api", tags=["ocr"])

os.makedirs(settings.UPLOAD_TMP_DIR, exist_ok=True)

SUPPORTED_EXTENSIONS = {"pdf", "docx", "jpg", "jpeg", "png"}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _run_ocr(local_path: str, ext: str) -> str:
    if ext == "pdf":
        return pdf_processor.extract_text_from_pdf(local_path)
    if ext == "docx":
        return docx_processor.extract_text_from_docx(local_path)
    if ext in {"jpg", "jpeg", "png"}:
        return image_processor.extract_text_from_image(local_path)
    raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported file format: .{ext}")


def _events_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start <= b_end and b_start <= a_end


async def _find_conflicts(venue: str, event_date: str, end_date: str | None) -> list[dict]:
    """Query verified events at the same venue and check for a date/time overlap."""
    db = get_supabase()
    result = db.table("events").select("*").ilike("venue", f"%{venue}%").eq("is_verified", True).execute()

    try:
        new_start = datetime.fromisoformat(event_date)
    except (ValueError, TypeError):
        return []  # can't reliably detect conflicts without a parseable date
    new_end = new_start
    if end_date:
        try:
            new_end = datetime.fromisoformat(end_date)
        except ValueError:
            new_end = new_start

    conflicts = []
    for row in result.data or []:
        try:
            existing_start = datetime.fromisoformat(row["event_date"])
            existing_end = datetime.fromisoformat(row["end_date"]) if row.get("end_date") else existing_start
        except (ValueError, TypeError):
            continue
        if _events_overlap(new_start, new_end, existing_start, existing_end):
            conflicts.append(row)

    return conflicts


# ---------------------------------------------------------------------------
# Phase 1 — Upload & OCR draft (no DB write)
# ---------------------------------------------------------------------------

@router.post("/upload-poster", status_code=status.HTTP_200_OK)
async def upload_poster(
    file: UploadFile = File(...),
    admin: CurrentUser = Depends(require_admin),
):
    """
    Admin-only. Uploads a poster, runs OCR + LLM extraction, and returns
    the structured draft for admin review. Does NOT write to the database.
    The admin must call POST /api/events/publish after reviewing the fields.
    """
    ext = (file.filename or "").split(".")[-1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported file type .{ext}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    contents = await file.read()
    local_filename = f"{uuid.uuid4().hex}_{file.filename}"
    local_path = os.path.join(settings.UPLOAD_TMP_DIR, local_filename)
    with open(local_path, "wb") as f:
        f.write(contents)

    db = get_supabase()

    # 1. Upload raw file to Supabase Storage (for audit trail)
    storage_path = f"posters/{local_filename}"
    file_url = None
    try:
        db.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
            storage_path, contents, {"content-type": file.content_type or "application/octet-stream"}
        )
        file_url = db.storage.from_(settings.SUPABASE_STORAGE_BUCKET).get_public_url(storage_path)
    except Exception as e:
        logger.warning("Supabase Storage upload failed (non-fatal for draft): %s", e)
        # Non-fatal — OCR can still proceed without storage

    record_activity(admin, "upload", f"Document: {file.filename}", {
        "filename": file.filename,
        "file_url": file_url,
        "size_bytes": len(contents),
    })

    # 2. OCR
    try:
        raw_text = _run_ocr(local_path, ext)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"OCR extraction failed: {e}")
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

    if not raw_text.strip():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "OCR produced no readable text from this document. "
            "Check that the file is not blank, encrypted, or a scanned image with very low resolution.",
        )

    # 3. Structure via local LLM
    try:
        structured = await extractor.extract_event(raw_text)
    except extractor.ExtractionError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Field extraction failed: {e}")

    # Return the draft — admin reviews before publishing
    return {
        "status": "draft",
        "message": "OCR and extraction complete. Review the fields below and click 'Publish' when ready.",
        "extracted": structured,
        "raw_ocr_text": raw_text,
        "file_url": file_url,
        "original_filename": file.filename,
    }


# ---------------------------------------------------------------------------
# Phase 2 — Publish reviewed event (write to DB + embed)
# ---------------------------------------------------------------------------

class PublishEventRequest(BaseModel):
    """
    The admin-reviewed event fields sent from the frontend review form.
    All fields are optional strings/ints matching what the LLM extractor returns,
    since the admin may clear or fill any of them during review.
    """
    title: str
    department: str | None = None
    venue: str
    event_date: str                 # ISO 8601 string: "2025-03-14T14:00:00"
    end_date: str | None = None
    description: str | None = None
    capacity: int | None = None
    file_url: str | None = None     # pass-through from the draft response
    category: str | None = None
    tags: str | None = None


@router.post("/events/publish", status_code=status.HTTP_201_CREATED)
async def publish_event(
    payload: PublishEventRequest,
    admin: CurrentUser = Depends(require_admin),
):
    """
    Admin-only. Accepts the finalized (human-reviewed) event fields,
    runs conflict detection, then writes to events + event_embeddings.
    """
    db = get_supabase()

    # 1. Conflict detection on the reviewed venue/date
    conflicts = await _find_conflicts(payload.venue, payload.event_date, payload.end_date)
    if conflicts:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "status": "conflict",
                "message": f"'{payload.venue}' already has an overlapping event booked in this time window.",
                "conflicting_events": conflicts,
            },
        )

    # 2. Save a document audit record
    uploaded_by_val = None if admin.supabase_uid == "00000000-0000-0000-0000-000000000000" else admin.supabase_uid
    doc_result = (
        db.table("documents")
        .insert(
            {
                "file_name": payload.title,
                "file_url": payload.file_url or "https://supabase.co/placeholder",
                "raw_ocr_output": payload.model_dump(mode="json"),
                "uploaded_by": uploaded_by_val,
            }
        )
        .execute()
    )
    document_id = doc_result.data[0]["id"] if doc_result.data else None

    # Normalize empty strings to None for clean DB storage
    category_val = payload.category.strip() if payload.category and payload.category.strip() else None
    tags_val = payload.tags.strip() if payload.tags and payload.tags.strip() else None

    # 3. Insert the verified event
    event_result = (
        db.table("events")
        .insert(
            {
                "document_id": document_id,
                "title": payload.title or "Untitled Event",
                "department": payload.department or None,
                "venue": payload.venue,
                "event_date": payload.event_date,
                "end_date": payload.end_date or None,
                "capacity": payload.capacity or 100,
                "description": payload.description or None,
                "category": category_val,
                "tags": tags_val,
                "is_verified": True,
            }
        )
        .execute()
    )
    event_id = event_result.data[0]["id"]
    record_activity(admin, "add", f"Event ID: {event_id} ({payload.title})", {"event_id": event_id})

    # 4. Generate and store RAG embeddings
    embed_source = " ".join(
        filter(None, [payload.title, payload.description, payload.venue, payload.department, payload.category, payload.tags])
    )
    chunks_stored = 0
    if embed_source.strip():
        try:
            chunks_stored = await vector_store.store_event_embeddings(event_id, embed_source)
        except Exception as e:
            logger.error("Embedding generation failed for event %s: %s", event_id, e)
            # Non-fatal — the event is published; RAG will work once embeddings are regenerated

    return {
        "status": "published",
        "message": f"'{payload.title}' is now live and searchable by the AI assistant.",
        "event_id": event_id,
        "document_id": document_id,
        "chunks_embedded": chunks_stored,
    }
