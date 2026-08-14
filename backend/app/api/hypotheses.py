"""Hypotheses API (PRD §9): RQ → Hypothesis → Experiment → Result chain."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import HYPOTHESIS_STATUSES, Hypothesis, ResearchQuestion
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/hypotheses", tags=["hypotheses"])


class HypothesisCreate(BaseModel):
    question_id: int
    description: str
    evidence: str = ""
    supporting: str = ""
    contradicting: str = ""


class HypothesisUpdate(BaseModel):
    description: str | None = None
    evidence: str | None = None
    supporting: str | None = None
    contradicting: str | None = None
    status: str | None = None


@router.get("")
def list_hypotheses(
    question_id: int | None = None,
    session: Session = Depends(get_session),
) -> list[Hypothesis]:
    q = select(Hypothesis).order_by(Hypothesis.created_at.desc())
    if question_id is not None:
        q = q.where(Hypothesis.question_id == question_id)
    return session.exec(q).all()


@router.post("", status_code=201)
def create_hypothesis(
    body: HypothesisCreate, session: Session = Depends(get_session)
) -> Hypothesis:
    desc = body.description.strip()
    if not desc:
        raise HTTPException(status_code=422, detail="description must not be empty")
    rq = session.get(ResearchQuestion, body.question_id)
    if not rq:
        raise HTTPException(status_code=422, detail="question not found")
    h = Hypothesis(
        question_id=body.question_id,
        description=desc,
        evidence=body.evidence,
        supporting=body.supporting,
        contradicting=body.contradicting,
    )
    session.add(h)
    session.commit()
    session.refresh(h)
    add_timeline_event(
        session,
        "hypothesis.created",
        f"假设：{desc[:60]}",
        project_id=rq.project_id,
    )
    return h


@router.patch("/{hypothesis_id}")
def update_hypothesis(
    hypothesis_id: int,
    body: HypothesisUpdate,
    session: Session = Depends(get_session),
) -> Hypothesis:
    h = session.get(Hypothesis, hypothesis_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in HYPOTHESIS_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    for key, value in data.items():
        setattr(h, key, value)
    h.updated_at = datetime.now(timezone.utc)
    session.add(h)
    session.commit()
    session.refresh(h)
    return h


@router.delete("/{hypothesis_id}")
def delete_hypothesis(
    hypothesis_id: int, session: Session = Depends(get_session)
) -> dict:
    h = session.get(Hypothesis, hypothesis_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hypothesis not found")
    session.delete(h)
    session.commit()
    return {"ok": True}
