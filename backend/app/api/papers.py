"""Papers API (PRD §10): metadata management, linked to projects/questions.

Full Zotero integration arrives in Phase 5; zotero_key is reserved here.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import PAPER_STATUSES, Paper, PaperQuestion, ResearchQuestion
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/papers", tags=["papers"])


class PaperCreate(BaseModel):
    title: str
    authors: str = ""
    year: str = ""
    journal: str = ""
    doi: str = ""
    url: str = ""
    abstract: str = ""
    notes: str = ""
    project_id: int | None = None


class PaperUpdate(BaseModel):
    title: str | None = None
    authors: str | None = None
    year: str | None = None
    journal: str | None = None
    doi: str | None = None
    url: str | None = None
    abstract: str | None = None
    notes: str | None = None
    status: str | None = None
    project_id: int | None = None


class LinkQuestionIn(BaseModel):
    question_id: int


@router.get("")
def list_papers(
    project_id: int | None = None,
    question_id: int | None = None,
    limit: int = 100,
    session: Session = Depends(get_session),
) -> list[Paper]:
    q = select(Paper).order_by(Paper.created_at.desc())
    if project_id is not None:
        q = q.where(Paper.project_id == project_id)
    if question_id is not None:
        linked = session.exec(
            select(PaperQuestion.paper_id).where(
                PaperQuestion.question_id == question_id
            )
        ).all()
        q = q.where(Paper.id.in_(linked))
    return session.exec(q.limit(limit)).all()


@router.post("", status_code=201)
def create_paper(body: PaperCreate, session: Session = Depends(get_session)) -> Paper:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    paper = Paper(**body.model_dump())
    session.add(paper)
    session.commit()
    session.refresh(paper)
    add_timeline_event(
        session,
        "paper.added",
        f"文献：{title[:60]}",
        project_id=paper.project_id,
    )
    return paper


@router.patch("/{paper_id}")
def update_paper(
    paper_id: int, body: PaperUpdate, session: Session = Depends(get_session)
) -> Paper:
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in PAPER_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    for key, value in data.items():
        setattr(paper, key, value)
    paper.updated_at = datetime.now(timezone.utc)
    session.add(paper)
    session.commit()
    session.refresh(paper)
    return paper


@router.delete("/{paper_id}")
def delete_paper(paper_id: int, session: Session = Depends(get_session)) -> dict:
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    session.delete(paper)
    session.commit()
    return {"ok": True}


# ------------------------------------------------------------ question links

@router.post("/{paper_id}/questions", status_code=201)
def link_question(
    paper_id: int, body: LinkQuestionIn, session: Session = Depends(get_session)
) -> dict:
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if not session.get(ResearchQuestion, body.question_id):
        raise HTTPException(status_code=422, detail="question not found")
    existing = session.exec(
        select(PaperQuestion).where(
            PaperQuestion.paper_id == paper_id,
            PaperQuestion.question_id == body.question_id,
        )
    ).first()
    if existing:
        return {"ok": True}
    session.add(PaperQuestion(paper_id=paper_id, question_id=body.question_id))
    session.commit()
    return {"ok": True}


@router.delete("/{paper_id}/questions/{question_id}")
def unlink_question(
    paper_id: int, question_id: int, session: Session = Depends(get_session)
) -> dict:
    link = session.exec(
        select(PaperQuestion).where(
            PaperQuestion.paper_id == paper_id,
            PaperQuestion.question_id == question_id,
        )
    ).first()
    if link:
        session.delete(link)
        session.commit()
    return {"ok": True}
