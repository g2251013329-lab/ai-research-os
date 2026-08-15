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
    event_type: str  # task.* | inbox.* | focus.* | learning.* | project.* | rq.* ...
    title: str
    detail: str = ""
    project_id: int | None = None  # scopes research events to a project
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


# ---------------------------------------------------------------- research

class Project(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    status: str = "active"  # active | paused | completed | archived
    color: str = "ocean"
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ResearchQuestion(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    title: str
    description: str = ""
    status: str = "open"  # open | exploring | testing | supported | rejected | resolved
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Hypothesis(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="researchquestion.id")
    description: str
    evidence: str = ""
    supporting: str = ""  # supporting papers / observations
    contradicting: str = ""
    status: str = "proposed"  # proposed | testing | supported | weakly_supported | rejected
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Paper(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    authors: str = ""
    year: str = ""
    journal: str = ""
    doi: str = ""
    url: str = ""
    abstract: str = ""
    notes: str = ""
    status: str = "unread"  # unread | reading | read
    project_id: int | None = Field(default=None, foreign_key="project.id")
    zotero_key: str = ""  # filled by Zotero integration (Phase 5)
    local_path: str = ""  # uploaded PDF file path (drag & drop import)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PaperQuestion(SQLModel, table=True):
    """Junction: a paper can support multiple research questions."""

    id: int | None = Field(default=None, primary_key=True)
    paper_id: int = Field(foreign_key="paper.id")
    question_id: int = Field(foreign_key="researchquestion.id")


class Experiment(SQLModel, table=True):
    """Structured experiment record (PRD §13, 13 fields)."""

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    question_id: int | None = Field(default=None, foreign_key="researchquestion.id")
    hypothesis_id: int | None = Field(default=None, foreign_key="hypothesis.id")
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
    status: str = "planned"  # planned | running | completed | abandoned
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class AIContextEntry(SQLModel, table=True):
    """AI Research Memory (PRD §21.2): user-confirmed facts, inspectable."""

    id: int | None = Field(default=None, primary_key=True)
    kind: str = "fact"  # fact | finding | decision | terminology | note
    content: str
    project_id: int | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ScheduleItem(SQLModel, table=True):
    """Time-blocked daily plan (PRD §5.3): date + start/end time + title."""

    id: int | None = Field(default=None, primary_key=True)
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str = ""  # HH:MM (optional)
    title: str
    kind: str = "general"  # general | learning | research | experiment | leisure
    created_at: datetime = Field(default_factory=utcnow)


TASK_KINDS = ("general", "learning", "research", "experiment")
TASK_STATUSES = ("todo", "doing", "done")
TASK_PRIORITIES = ("low", "medium", "high")
CONCEPT_STATUSES = ("not_started", "learning", "practiced", "understood", "mastered")
SESSION_STATUSES = ("completed", "partial", "skipped")
PROJECT_STATUSES = ("active", "paused", "completed", "archived")
QUESTION_STATUSES = ("open", "exploring", "testing", "supported", "rejected", "resolved")
HYPOTHESIS_STATUSES = ("proposed", "testing", "supported", "weakly_supported", "rejected")
PAPER_STATUSES = ("unread", "reading", "read")
EXPERIMENT_STATUSES = ("planned", "running", "completed", "abandoned")
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
