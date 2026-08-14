"""Research Questions API (PRD §8): first-class scientific logic objects."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import QUESTION_STATUSES, Project, ResearchQuestion
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/questions", tags=["questions"])


class QuestionCreate(BaseModel):
    project_id: int
    title: str
    description: str = ""


class QuestionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


@router.get("")
def list_questions(
    project_id: int | None = None,
    session: Session = Depends(get_session),
) -> list[ResearchQuestion]:
    q = select(ResearchQuestion).order_by(ResearchQuestion.created_at.desc())
    if project_id is not None:
        q = q.where(ResearchQuestion.project_id == project_id)
    return session.exec(q).all()


@router.post("", status_code=201)
def create_question(
    body: QuestionCreate, session: Session = Depends(get_session)
) -> ResearchQuestion:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    if not session.get(Project, body.project_id):
        raise HTTPException(status_code=422, detail="project not found")
    q = ResearchQuestion(
        project_id=body.project_id, title=title, description=body.description
    )
    session.add(q)
    session.commit()
    session.refresh(q)
    add_timeline_event(
        session,
        "rq.created",
        f"研究问题：{title}",
        project_id=body.project_id,
    )
    return q


@router.patch("/{question_id}")
def update_question(
    question_id: int, body: QuestionUpdate, session: Session = Depends(get_session)
) -> ResearchQuestion:
    q = session.get(ResearchQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in QUESTION_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    for key, value in data.items():
        setattr(q, key, value)
    q.updated_at = datetime.now(timezone.utc)
    session.add(q)
    session.commit()
    session.refresh(q)
    return q


@router.delete("/{question_id}")
def delete_question(question_id: int, session: Session = Depends(get_session)) -> dict:
    q = session.get(ResearchQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    session.delete(q)
    session.commit()
    return {"ok": True}
