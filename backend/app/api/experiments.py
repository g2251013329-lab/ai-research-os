"""Experiments API (PRD §13): structured 13-field records."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import (
    EXPERIMENT_STATUSES,
    Experiment,
    Hypothesis,
    Project,
    ResearchQuestion,
)
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/experiments", tags=["experiments"])

EXPERIMENT_FIELDS = (
    "objective",
    "hypothesis_text",
    "materials",
    "protocol",
    "variables",
    "procedure",
    "raw_data",
    "results",
    "figures",
    "interpretation",
    "problems",
    "next_step",
)


class ExperimentCreate(BaseModel):
    project_id: int
    question_id: int | None = None
    hypothesis_id: int | None = None
    title: str
    objective: str = ""
    hypothesis_text: str = ""
    materials: str = ""
    protocol: str = ""
    variables: str = ""
    procedure: str = ""
    raw_data: str = ""
    results: str = ""
    figures: str = ""
    interpretation: str = ""
    problems: str = ""
    next_step: str = ""


class ExperimentUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    question_id: int | None = None
    hypothesis_id: int | None = None
    objective: str | None = None
    hypothesis_text: str | None = None
    materials: str | None = None
    protocol: str | None = None
    variables: str | None = None
    procedure: str | None = None
    raw_data: str | None = None
    results: str | None = None
    figures: str | None = None
    interpretation: str | None = None
    problems: str | None = None
    next_step: str | None = None


@router.get("")
def list_experiments(
    project_id: int | None = None,
    question_id: int | None = None,
    session: Session = Depends(get_session),
) -> list[Experiment]:
    q = select(Experiment).order_by(Experiment.created_at.desc())
    if project_id is not None:
        q = q.where(Experiment.project_id == project_id)
    if question_id is not None:
        q = q.where(Experiment.question_id == question_id)
    return session.exec(q).all()


@router.post("", status_code=201)
def create_experiment(
    body: ExperimentCreate, session: Session = Depends(get_session)
) -> Experiment:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    if not session.get(Project, body.project_id):
        raise HTTPException(status_code=422, detail="project not found")
    if body.question_id and not session.get(ResearchQuestion, body.question_id):
        raise HTTPException(status_code=422, detail="question not found")
    if body.hypothesis_id and not session.get(Hypothesis, body.hypothesis_id):
        raise HTTPException(status_code=422, detail="hypothesis not found")
    exp = Experiment(**body.model_dump())
    session.add(exp)
    session.commit()
    session.refresh(exp)
    add_timeline_event(
        session, "experiment.created", f"实验：{title}", project_id=body.project_id
    )
    return exp


@router.patch("/{experiment_id}")
def update_experiment(
    experiment_id: int,
    body: ExperimentUpdate,
    session: Session = Depends(get_session),
) -> Experiment:
    exp = session.get(Experiment, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data:
        if data["status"] not in EXPERIMENT_STATUSES:
            raise HTTPException(status_code=422, detail="invalid status")
        add_timeline_event(
            session,
            "experiment.status",
            f"实验「{exp.title}」→ {data['status']}",
            project_id=exp.project_id,
        )
    for key, value in data.items():
        setattr(exp, key, value)
    exp.updated_at = datetime.now(timezone.utc)
    session.add(exp)
    session.commit()
    session.refresh(exp)
    return exp


@router.delete("/{experiment_id}")
def delete_experiment(
    experiment_id: int, session: Session = Depends(get_session)
) -> dict:
    exp = session.get(Experiment, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    session.delete(exp)
    session.commit()
    return {"ok": True}
