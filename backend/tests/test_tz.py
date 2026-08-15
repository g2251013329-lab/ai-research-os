"""Timezone-boundary tests: backend stores naive UTC; clients report a UTC
offset (minutes) so "today" and month bounds follow the user's local calendar.
"""
from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

import app.core.tz as tz_mod
from app.core.db import engine
from app.main import app
from app.models import Task

client = TestClient(app)


def _cleanup():
    for t in client.get("/api/tasks", params={"limit": 100}).json():
        client.delete(f"/api/tasks/{t['id']}")


def test_tz_helpers():
    from app.core.tz import local_day_start_utc, month_bounds_utc, to_local_date

    # UTC+8: local midnight of Aug 15 == Aug 14 16:00 UTC
    assert local_day_start_utc(-480, now=datetime(2026, 8, 15, 2, 0)) == datetime(
        2026, 8, 14, 16, 0
    )
    # UTC itself keeps the plain midnight
    assert local_day_start_utc(0, now=datetime(2026, 8, 15, 2, 0)) == datetime(
        2026, 8, 15, 0, 0
    )
    # 18:00 UTC on Aug 14 is Aug 15 02:00 in UTC+8
    assert to_local_date(datetime(2026, 8, 14, 18, 0), -480) == "2026-08-15"
    assert to_local_date(datetime(2026, 8, 15, 2, 0), 0) == "2026-08-15"
    # Local month [start, end) in UTC: UTC+8 August starts Jul 31 16:00 UTC
    assert month_bounds_utc("2026-08", -480) == (
        datetime(2026, 7, 31, 16, 0),
        datetime(2026, 8, 31, 16, 0),
    )
    assert month_bounds_utc("2026-12", 0) == (
        datetime(2026, 12, 1, 0, 0),
        datetime(2027, 1, 1, 0, 0),
    )


def test_dashboard_local_day_count(monkeypatch):
    _cleanup()
    try:
        # Freeze "now" at 2026-08-15 02:00 UTC == 10:00 local (UTC+8)
        monkeypatch.setattr(tz_mod, "now_utc_naive", lambda: datetime(2026, 8, 15, 2, 0))
        # Task completed Aug 14 18:00 UTC == Aug 15 02:00 local: local-day "today"
        tid = client.post("/api/tasks", json={"title": "边界任务"}).json()["id"]
        with Session(engine, expire_on_commit=False) as s:
            t = s.get(Task, tid)
            assert t is not None
            t.status = "done"
            t.completed_at = datetime(2026, 8, 14, 18, 0)
            s.add(t)
            s.commit()

        assert client.get("/api/dashboard?tz_offset_minutes=-480").json()["today_done"] == 1
        assert client.get("/api/dashboard?tz_offset_minutes=0").json()["today_done"] == 0
    finally:
        _cleanup()
