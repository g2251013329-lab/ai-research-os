"""Research statistics (P1): quick insight numbers across the workspace."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import (
    Experiment,
    FocusSession,
    Hypothesis,
    LearningConcept,
    Paper,
    ResearchQuestion,
    Task,
)

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
def stats(session: Session = Depends(get_session)) -> dict:
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    def count(model, *conds):
        q = select(model)
        for c in conds:
            q = q.where(c)
        return len(session.exec(q).all())

    rqs = session.exec(select(ResearchQuestion)).all()
    rq_by_status: dict[str, int] = {}
    for rq in rqs:
        rq_by_status[rq.status] = rq_by_status.get(rq.status, 0) + 1

    hyps = session.exec(select(Hypothesis)).all()
    hyp_by_status: dict[str, int] = {}
    for h in hyps:
        hyp_by_status[h.status] = hyp_by_status.get(h.status, 0) + 1

    return {
        "papers": {
            "total": count(Paper),
            "read": count(Paper, Paper.status == "read"),
        },
        "experiments": {
            "total": count(Experiment),
            "completed": count(Experiment, Experiment.status == "completed"),
        },
        "questions": {"total": len(rqs), "resolved": rq_by_status.get("resolved", 0)},
        "hypotheses": {
            "total": len(hyps),
            "supported": hyp_by_status.get("supported", 0),
        },
        "tasks": {"done_7d": count(Task, Task.status == "done", Task.completed_at >= week_ago)},
        "focus": {"minutes_7d": sum(f.duration_min for f in session.exec(select(FocusSession).where(FocusSession.ended_at >= week_ago)).all())},
        "concepts": {
            "total": count(LearningConcept),
            "mastered": count(LearningConcept, LearningConcept.status == "mastered"),
        },
    }
