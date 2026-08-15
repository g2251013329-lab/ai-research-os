"""Dashboard aggregation API (PRD §4): Today, overviews, recent activity.

Projects / papers / experiments / questions / hypotheses tables arrive in
Phase 4; counts return 0 with the structure in place so the frontend can
render empty states today.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import (
    Experiment,
    FocusSession,
    Hypothesis,
    LearningConcept,
    Paper,
    Project,
    ResearchQuestion,
    StudySession,
    Task,
    TimelineEvent,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(session: Session = Depends(get_session)) -> dict:
    # Today's tasks: anything not done (overdue / due today bubble up)
    active = session.exec(
        select(Task).where(Task.status != "done").order_by(Task.created_at.desc()).limit(20)
    ).all()
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    done_today = session.exec(
        select(Task).where(
            Task.status == "done", Task.completed_at >= today_start
        )
    ).all()

    focus_today = session.exec(
        select(FocusSession).where(FocusSession.ended_at >= today_start)
    ).all()
    focus_week_start = datetime.now(timezone.utc) - timedelta(days=7)
    focus_week = session.exec(
        select(FocusSession).where(FocusSession.ended_at >= focus_week_start)
    ).all()

    activity = session.exec(
        select(TimelineEvent).order_by(TimelineEvent.created_at.desc()).limit(8)
    ).all()

    concepts = session.exec(select(LearningConcept)).all()
    concept_status: dict[str, int] = {}
    for c in concepts:
        concept_status[c.status] = concept_status.get(c.status, 0) + 1

    # Real research counts (PRD §4.2)
    open_questions = session.exec(
        select(ResearchQuestion).where(
            ResearchQuestion.status.in_(("open", "exploring", "testing"))
        )
    ).all()
    active_hypotheses = session.exec(
        select(Hypothesis).where(Hypothesis.status.in_(("proposed", "testing")))
    ).all()

    return {
        "today_tasks": [t.model_dump(mode="json") for t in active],
        "today_done": len(done_today),
        "done_today_tasks": [
            t.model_dump(mode="json")
            for t in sorted(done_today, key=lambda x: x.completed_at or x.created_at, reverse=True)
        ],
        "focus_minutes_today": sum(f.duration_min for f in focus_today),
        "learning": {
            "streak_days": _learning_streak(session),
            "weekly_focus_minutes": sum(f.duration_min for f in focus_week),
            "concepts": {"total": len(concepts), **concept_status},
        },
        "counts": {
            "projects": len(session.exec(select(Project)).all()),
            "papers": len(session.exec(select(Paper)).all()),
            "experiments": len(session.exec(select(Experiment)).all()),
            "open_questions": len(open_questions),
            "active_hypotheses": len(active_hypotheses),
        },
        "recent_activity": [e.model_dump(mode="json") for e in activity],
    }


def _learning_streak(session: Session) -> int:
    """Consecutive days (ending today) with a completed learning task OR a check-in."""
    rows = session.exec(
        select(Task.completed_at).where(
            Task.kind == "learning", Task.status == "done", Task.completed_at.is_not(None)
        )
    ).all()
    days = {r.date().isoformat() for r in rows if r is not None}
    for d in session.exec(select(StudySession.session_date)).all():
        days.add(d)
    streak = 0
    while (date.today() - timedelta(days=streak)).isoformat() in days:
        streak += 1
    return streak
