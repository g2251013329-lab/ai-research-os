"""SQLModel entities for AI Research OS (Phase 2 core)."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Task(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(min_length=1, max_length=500)
    description: str = ""
    kind: str = "general"  # general | learning | research | experiment
    status: str = "todo"  # todo | doing | done
    priority: str = "medium"  # low | medium | high
    due_date: str | None = None  # ISO date (YYYY-MM-DD)
    project_id: int | None = None  # reserved for Phase 4 projects
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    completed_at: datetime | None = None


class InboxItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    kind: str = "other"  # paper | idea | note | url | image | experiment |
    #                     # question | github | task | reference | other
    text: str = Field(min_length=1, max_length=2000)
    source_url: str = ""
    status: str = "open"  # open | done
    created_at: datetime = Field(default_factory=utcnow)


class FocusSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    task_title: str = ""
    duration_min: int = Field(ge=1, le=600)
    started_at: datetime = Field(default_factory=utcnow)
    ended_at: datetime = Field(default_factory=utcnow)


class TimelineEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    event_type: str  # task.created | task.completed | inbox.added | focus.completed
    title: str
    detail: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class LearningConcept(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    parent_id: int | None = Field(default=None, foreign_key="learningconcept.id")
    status: str = "not_started"  # not_started | learning | practiced | understood | mastered
    sort_order: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class StudySession(SQLModel, table=True):
    """Daily check-in (PRD §5.4)."""

    id: int | None = Field(default=None, primary_key=True)
    topic: str
    duration_min: int = Field(ge=1, le=720)
    status: str = "completed"  # completed | partial | skipped
    notes: str = ""
    reflections: str = ""
    takeaways: str = ""
    session_date: str  # ISO date the session belongs to (YYYY-MM-DD)
    created_at: datetime = Field(default_factory=utcnow)


TASK_KINDS = ("general", "learning", "research", "experiment")
TASK_STATUSES = ("todo", "doing", "done")
TASK_PRIORITIES = ("low", "medium", "high")
CONCEPT_STATUSES = ("not_started", "learning", "practiced", "understood", "mastered")
SESSION_STATUSES = ("completed", "partial", "skipped")
INBOX_KINDS = (
    "paper",
    "idea",
    "note",
    "url",
    "image",
    "experiment",
    "question",
    "github",
    "task",
    "reference",
    "other",
)
