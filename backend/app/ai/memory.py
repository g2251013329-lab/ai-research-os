"""AI Research Memory (PRD §21.2): inspectable, user-controlled long-term context."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import AIContextEntry

router = APIRouter(prefix="/api/memory", tags=["memory"])

KINDS = ("fact", "finding", "decision", "terminology", "note")


class MemoryCreate(BaseModel):
    kind: str = "fact"
    content: str
    project_id: int | None = None


class MemoryUpdate(BaseModel):
    content: str | None = None
    kind: str | None = None


def memory_context(session: Session, limit: int = 12) -> str:
    """Recent memory entries, injected into the AI system prompt."""
    entries = session.exec(
        select(AIContextEntry).order_by(AIContextEntry.updated_at.desc()).limit(limit)
    ).all()
    if not entries:
        return ""
    lines = []
    for e in entries:
        tag = f"[{e.kind}]" + (f" (项目{e.project_id})" if e.project_id else "")
        lines.append(f"- {tag} {e.content}")
    return "## 长期记忆（用户确认过的事实，可参考）\n" + "\n".join(lines)


@router.get("")
def list_memory(session: Session = Depends(get_session)) -> list[AIContextEntry]:
    return session.exec(
        select(AIContextEntry).order_by(AIContextEntry.updated_at.desc()).limit(100)
    ).all()


@router.post("", status_code=201)
def create_memory(
    body: MemoryCreate, session: Session = Depends(get_session)
) -> AIContextEntry:
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="content must not be empty")
    if body.kind not in KINDS:
        raise HTTPException(status_code=422, detail="invalid kind")
    entry = AIContextEntry(
        kind=body.kind, content=content, project_id=body.project_id
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.patch("/{entry_id}")
def update_memory(
    entry_id: int, body: MemoryUpdate, session: Session = Depends(get_session)
) -> AIContextEntry:
    entry = session.get(AIContextEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    if body.content is not None:
        entry.content = body.content.strip()
    if body.kind is not None:
        if body.kind not in KINDS:
            raise HTTPException(status_code=422, detail="invalid kind")
        entry.kind = body.kind
    entry.updated_at = datetime.now(timezone.utc)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_memory(entry_id: int, session: Session = Depends(get_session)) -> dict:
    entry = session.get(AIContextEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    session.delete(entry)
    session.commit()
    return {"ok": True}
