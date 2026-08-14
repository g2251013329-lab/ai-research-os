"""Focus sessions API (PRD §22): 25/50/90 min sessions, recorded for stats."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import FocusSession
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/focus", tags=["focus"])


class FocusCreate(BaseModel):
    duration_min: int
    task_title: str = ""


@router.post("/sessions", status_code=201)
def create_focus_session(
    body: FocusCreate, session: Session = Depends(get_session)
) -> FocusSession:
    fs = FocusSession(
        duration_min=body.duration_min,
        task_title=body.task_title.strip()[:200],
    )
    session.add(fs)
    session.commit()
    session.refresh(fs)
    add_timeline_event(
        session,
        "focus.completed",
        f"{body.duration_min} min focus",
        detail=fs.task_title,
    )
    return fs


@router.get("/today")
def focus_today(session: Session = Depends(get_session)) -> dict:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = session.exec(select(FocusSession).where(FocusSession.ended_at >= start)).all()
    return {"minutes": sum(r.duration_min for r in rows), "sessions": len(rows)}


@router.get("/week")
def focus_week(session: Session = Depends(get_session)) -> dict:
    start = datetime.now(timezone.utc) - timedelta(days=7)
    rows = session.exec(select(FocusSession).where(FocusSession.ended_at >= start)).all()
    return {"minutes": sum(r.duration_min for r in rows), "sessions": len(rows)}
