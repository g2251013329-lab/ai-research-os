"""Daily schedule API (PRD §5.3 time blocks): date + time-range arrangements."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import ScheduleItem
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
KINDS = ("general", "learning", "research", "experiment", "leisure")


class ScheduleCreate(BaseModel):
    date: str
    start_time: str
    end_time: str = ""
    title: str
    kind: str = "general"


class ScheduleUpdate(BaseModel):
    start_time: str | None = None
    end_time: str | None = None
    title: str | None = None
    kind: str | None = None


def _validate(body: ScheduleCreate | ScheduleUpdate, partial: bool = False) -> None:
    if not partial or body.start_time is not None:
        if not TIME_RE.match(body.start_time or ""):
            raise HTTPException(status_code=422, detail="start_time 格式应为 HH:MM")
    if not partial or body.end_time is not None:
        if body.end_time and not TIME_RE.match(body.end_time):
            raise HTTPException(status_code=422, detail="end_time 格式应为 HH:MM")
    if not partial or body.kind is not None:
        if body.kind not in KINDS:
            raise HTTPException(status_code=422, detail=f"kind 应为 {KINDS}")


@router.get("")
def list_schedule(
    date: str | None = None,
    month: str | None = None,
    session: Session = Depends(get_session),
) -> list[ScheduleItem]:
    q = select(ScheduleItem).order_by(ScheduleItem.date, ScheduleItem.start_time)
    if date:
        q = q.where(ScheduleItem.date == date)
    if month:
        q = q.where(ScheduleItem.date.startswith(month))
    return session.exec(q).all()


@router.post("", status_code=201)
def create_schedule(
    body: ScheduleCreate, session: Session = Depends(get_session)
) -> ScheduleItem:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    if not DATE_RE.match(body.date):
        raise HTTPException(status_code=422, detail="date 格式应为 YYYY-MM-DD")
    _validate(body)
    item = ScheduleItem(**body.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    add_timeline_event(
        session,
        "schedule.created",
        f"日程：{title}（{body.date} {body.start_time}）",
    )
    return item


@router.patch("/{item_id}")
def update_schedule(
    item_id: int, body: ScheduleUpdate, session: Session = Depends(get_session)
) -> ScheduleItem:
    item = session.get(ScheduleItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    _validate(body, partial=True)
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_schedule(item_id: int, session: Session = Depends(get_session)) -> dict:
    item = session.get(ScheduleItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    session.delete(item)
    session.commit()
    return {"ok": True}
