"""Local-time helpers.

The backend stores all timestamps as naive UTC (serialized without an offset
marker); clients report their UTC offset in minutes (e.g. UTC+8 = -480) so
that "today" / month boundaries follow the user's actual local calendar.

Mapping used here: local_wall = utc + (-offset_minutes) hours.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone


def now_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_day_start_utc(offset_minutes: int, now: datetime | None = None) -> datetime:
    """Naive-UTC datetime of 00:00 of the client's local day containing `now`."""
    now_utc = now if now is not None else now_utc_naive()
    local_wall = now_utc + timedelta(minutes=-offset_minutes)
    local_midnight = local_wall.replace(hour=0, minute=0, second=0, microsecond=0)
    return local_midnight + timedelta(minutes=offset_minutes)


def to_local_date(dt: datetime, offset_minutes: int) -> str:
    """Local calendar date (YYYY-MM-DD) of a naive-UTC datetime."""
    return (dt + timedelta(minutes=-offset_minutes)).date().isoformat()


def local_today(offset_minutes: int) -> datetime.date:
    return (now_utc_naive() + timedelta(minutes=-offset_minutes)).date()


def month_bounds_utc(month: str, offset_minutes: int) -> tuple[datetime, datetime]:
    """Naive-UTC bounds of the client's local month (start inclusive, end exclusive)."""
    y, m = int(month[:4]), int(month[5:7])
    start = datetime(y, m, 1) + timedelta(minutes=offset_minutes)
    end = (
        datetime(y + 1, 1, 1) if m == 12 else datetime(y, m + 1, 1)
    ) + timedelta(minutes=offset_minutes)
    return start, end
