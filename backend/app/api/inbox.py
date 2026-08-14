"""Research Inbox API (PRD §11): capture anything, classify later."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import INBOX_KINDS, InboxItem
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


class InboxCreate(BaseModel):
    kind: str = "other"
    text: str
    source_url: str = ""


class InboxUpdate(BaseModel):
    status: str | None = None
    kind: str | None = None


@router.get("")
def list_inbox(
    status: str | None = None,
    limit: int = 100,
    session: Session = Depends(get_session),
) -> list[InboxItem]:
    q = select(InboxItem).order_by(InboxItem.created_at.desc())
    if status:
        q = q.where(InboxItem.status == status)
    return session.exec(q.limit(limit)).all()


@router.post("", status_code=201)
def create_inbox_item(
    body: InboxCreate, session: Session = Depends(get_session)
) -> InboxItem:
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text must not be empty")
    if body.kind not in INBOX_KINDS:
        raise HTTPException(status_code=422, detail=f"kind must be one of {INBOX_KINDS}")
    item = InboxItem(kind=body.kind, text=text, source_url=body.source_url)
    session.add(item)
    session.commit()
    session.refresh(item)
    add_timeline_event(session, "inbox.added", text[:80], detail=f"kind={item.kind}")
    return item


@router.patch("/{item_id}")
def update_inbox_item(
    item_id: int, body: InboxUpdate, session: Session = Depends(get_session)
) -> InboxItem:
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    if body.status is not None:
        if body.status not in ("open", "done"):
            raise HTTPException(status_code=422, detail="invalid status")
        item.status = body.status
    if body.kind is not None:
        if body.kind not in INBOX_KINDS:
            raise HTTPException(status_code=422, detail="invalid kind")
        item.kind = body.kind
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_inbox_item(item_id: int, session: Session = Depends(get_session)) -> dict:
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    session.delete(item)
    session.commit()
    return {"ok": True}
