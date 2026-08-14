"""Timeline events: the traceability layer ("how did I get here?")."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import TimelineEvent

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


def add_timeline_event(
    session: Session,
    event_type: str,
    title: str,
    detail: str = "",
    project_id: int | None = None,
) -> None:
    session.add(
        TimelineEvent(
            event_type=event_type, title=title, detail=detail, project_id=project_id
        )
    )
    session.commit()


@router.get("")
def list_events(
    project_id: int | None = None,
    limit: int = 20,
    session: Session = Depends(get_session),
) -> list[TimelineEvent]:
    q = select(TimelineEvent)
    if project_id is not None:
        q = q.where(TimelineEvent.project_id == project_id)
    return session.exec(q.order_by(TimelineEvent.created_at.desc()).limit(limit)).all()
