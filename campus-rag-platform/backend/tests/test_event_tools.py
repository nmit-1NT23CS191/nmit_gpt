"""
Unit tests for tools/event_tools.py — the four LangGraph agent tools.
The Supabase client is mocked throughout so these run without a live
Supabase project, matching how backend-tests runs in CI (deploy.yml).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret")

import pytest
from unittest.mock import MagicMock, patch

from tools import event_tools


def _mock_supabase_chain(return_data=None, count=None):
    """Builds a MagicMock that supports Supabase's fluent query chain
    (.table().select().eq().limit().execute()) and returns a canned result."""
    mock_result = MagicMock()
    mock_result.data = return_data if return_data is not None else []
    mock_result.count = count

    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.ilike.return_value = chain
    chain.limit.return_value = chain
    chain.order.return_value = chain
    chain.not_.is_.return_value = chain
    chain.insert.return_value = chain
    chain.execute.return_value = mock_result
    return chain


@pytest.mark.asyncio
async def test_register_user_for_event_user_not_found():
    fake_db = MagicMock()
    fake_db.table.return_value = _mock_supabase_chain(return_data=[])

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.register_user_for_event("nobody@nmit.edu", "Hackfest")

    assert result["success"] is False
    assert "No user found" in result["message"]


@pytest.mark.asyncio
async def test_register_user_for_event_event_not_found():
    fake_db = MagicMock()

    def table_side_effect(name):
        if name == "users":
            return _mock_supabase_chain(return_data=[{"id": 1, "supabase_uid": "uid-123"}])
        if name == "events":
            return _mock_supabase_chain(return_data=[])
        return _mock_supabase_chain()

    fake_db.table.side_effect = table_side_effect

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.register_user_for_event("student@nmit.edu", "Nonexistent Event")

    assert result["success"] is False
    assert "No verified event" in result["message"]


@pytest.mark.asyncio
async def test_register_user_for_event_success():
    fake_db = MagicMock()

    def table_side_effect(name):
        if name == "users":
            return _mock_supabase_chain(return_data=[{"id": 1, "supabase_uid": "uid-123"}])
        if name == "events":
            return _mock_supabase_chain(return_data=[{"id": 42, "title": "Hackfest 2026", "capacity": 100}])
        if name == "registrations":
            return _mock_supabase_chain(return_data=[], count=5)
        return _mock_supabase_chain()

    fake_db.table.side_effect = table_side_effect

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.register_user_for_event("student@nmit.edu", "Hackfest")

    assert result["success"] is True
    assert result["event_id"] == 42


@pytest.mark.asyncio
async def test_register_user_for_event_at_capacity():
    fake_db = MagicMock()

    def table_side_effect(name):
        if name == "users":
            return _mock_supabase_chain(return_data=[{"id": 1, "supabase_uid": "uid-123"}])
        if name == "events":
            return _mock_supabase_chain(return_data=[{"id": 42, "title": "Hackfest 2026", "capacity": 2}])
        if name == "registrations":
            return _mock_supabase_chain(return_data=[], count=2)
        return _mock_supabase_chain()

    fake_db.table.side_effect = table_side_effect

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.register_user_for_event("student@nmit.edu", "Hackfest")

    assert result["success"] is False
    assert "full capacity" in result["message"]


@pytest.mark.asyncio
async def test_get_venue_coordinates_found():
    fake_db = MagicMock()
    fake_db.table.return_value = _mock_supabase_chain(
        return_data=[{"venue": "Auditorium", "latitude": 13.1067, "longitude": 77.5975}]
    )

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.get_venue_coordinates("Auditorium")

    assert result["found"] is True
    assert result["latitude"] == 13.1067


@pytest.mark.asyncio
async def test_get_venue_coordinates_not_found():
    fake_db = MagicMock()
    fake_db.table.return_value = _mock_supabase_chain(return_data=[])

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.get_venue_coordinates("Nonexistent Hall")

    assert result["found"] is False


@pytest.mark.asyncio
async def test_check_schedule_conflicts_detects_overlap():
    fake_db = MagicMock()
    fake_db.table.return_value = _mock_supabase_chain(
        return_data=[
            {
                "id": 1,
                "title": "Existing Event",
                "event_date": "2026-08-24T09:00:00",
                "end_date": "2026-08-24T18:00:00",
            }
        ]
    )

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.check_schedule_conflicts("Lab 3", "2026-08-24T10:00:00")

    assert result["has_conflict"] is True
    assert len(result["conflicting_events"]) == 1


@pytest.mark.asyncio
async def test_check_schedule_conflicts_no_overlap():
    fake_db = MagicMock()
    fake_db.table.return_value = _mock_supabase_chain(
        return_data=[
            {
                "id": 1,
                "title": "Existing Event",
                "event_date": "2026-08-20T09:00:00",
                "end_date": "2026-08-20T18:00:00",
            }
        ]
    )

    with patch("tools.event_tools.get_supabase", return_value=fake_db):
        result = await event_tools.check_schedule_conflicts("Lab 3", "2026-08-24T10:00:00")

    assert result["has_conflict"] is False
