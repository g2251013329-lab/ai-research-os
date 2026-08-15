"""Learning space API (PRD §5): roadmap, calendar, daily check-in, notes."""
from __future__ import annotations

import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import frontmatter
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..core.tz import month_bounds_utc
from ..core.user_settings import get_user_setting
from ..models import (
    CONCEPT_LINK_KINDS,
    CONCEPT_STATUSES,
    SESSION_STATUSES,
    ConceptLink,
    Experiment,
    FocusSession,
    LearningConcept,
    Paper,
    Project,
    ResearchQuestion,
    ScheduleItem,
    StudySession,
    Task,
)
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/learning", tags=["learning"])

# ---------------------------------------------------------------- roadmap

# PRD §5.5 example roadmap for the LLPS research area — seeded on first run.
LLPS_ROADMAP: list[tuple[str, list[tuple[str, list[str]]]]] = [
    (
        "LLPS",
        [
            (
                "Physical Principles",
                ["Thermodynamics", "Phase Diagrams", "Polymer Physics"],
            ),
            (
                "Molecular Mechanisms",
                ["IDRs (Intrinsically Disordered Regions)", "Multivalency", "PTMs"],
            ),
            ("Experimental Methods", ["FRAP", "Microscopy", "Turbidity Assays"]),
            ("Disease Mechanisms", ["Neurodevelopment"]),
        ],
    ),
]


def seed_learning_roadmap(session: Session) -> None:
    if session.exec(select(LearningConcept).limit(1)).first():
        return
    for top_title, branches in LLPS_ROADMAP:
        top = LearningConcept(title=top_title, sort_order=0)
        session.add(top)
        session.commit()
        session.refresh(top)
        for i, (branch_title, leaves) in enumerate(branches):
            branch = LearningConcept(
                title=branch_title, parent_id=top.id, sort_order=i
            )
            session.add(branch)
            session.commit()
            session.refresh(branch)
            for j, leaf_title in enumerate(leaves):
                session.add(
                    LearningConcept(
                        title=leaf_title, parent_id=branch.id, sort_order=j
                    )
                )
            session.commit()


class ConceptCreate(BaseModel):
    title: str
    parent_id: int | None = None
    description: str = ""


class ConceptUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    parent_id: int | None = None


@router.get("/roadmap")
def roadmap(session: Session = Depends(get_session)) -> list[dict]:
    concepts = session.exec(
        select(LearningConcept).order_by(
            LearningConcept.parent_id, LearningConcept.sort_order, LearningConcept.title
        )
    ).all()
    # link counts so the UI can badge concepts that connect to research
    link_counts: dict[int, int] = {}
    for link in session.exec(select(ConceptLink)).all():
        link_counts[link.concept_id] = link_counts.get(link.concept_id, 0) + 1
    by_parent: dict[int | None, list[dict]] = {}
    for c in concepts:
        node = c.model_dump(mode="json")
        node["link_count"] = link_counts.get(c.id, 0)
        by_parent.setdefault(c.parent_id, []).append(node)
    for children in by_parent.values():
        children.sort(key=lambda c: (c["sort_order"], c["title"]))

    def build(parent: int | None) -> list[dict]:
        return [
            {**c, "children": build(c["id"])} for c in by_parent.get(parent, [])
        ]

    return build(None)


@router.post("/concepts", status_code=201)
def create_concept(
    body: ConceptCreate, session: Session = Depends(get_session)
) -> LearningConcept:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    if body.parent_id is not None and not session.get(LearningConcept, body.parent_id):
        raise HTTPException(status_code=422, detail="parent concept not found")
    siblings = session.exec(
        select(LearningConcept).where(LearningConcept.parent_id == body.parent_id)
    ).all()
    concept = LearningConcept(
        title=title,
        description=body.description,
        parent_id=body.parent_id,
        sort_order=len(siblings),
    )
    session.add(concept)
    session.commit()
    session.refresh(concept)
    add_timeline_event(session, "learning.concept", f"概念：{title}")
    return concept


@router.patch("/concepts/{concept_id}")
def update_concept(
    concept_id: int, body: ConceptUpdate, session: Session = Depends(get_session)
) -> LearningConcept:
    concept = session.get(LearningConcept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in CONCEPT_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    if "parent_id" in data and data["parent_id"] is not None:
        if data["parent_id"] == concept.id:
            raise HTTPException(status_code=422, detail="cannot be its own parent")
        if not session.get(LearningConcept, data["parent_id"]):
            raise HTTPException(status_code=422, detail="parent concept not found")
    for key, value in data.items():
        setattr(concept, key, value)
    concept.updated_at = datetime.now(timezone.utc)
    session.add(concept)
    session.commit()
    session.refresh(concept)
    return concept


def _delete_concept_tree(session: Session, concept_id: int) -> int:
    """Recursively delete a concept, its subtree and all concept links. Returns count."""
    total = 0
    for child in session.exec(
        select(LearningConcept).where(LearningConcept.parent_id == concept_id)
    ).all():
        total += _delete_concept_tree(session, child.id)
    for link in session.exec(
        select(ConceptLink).where(ConceptLink.concept_id == concept_id)
    ).all():
        session.delete(link)
    concept = session.get(LearningConcept, concept_id)
    if concept:
        session.delete(concept)
        total += 1
    return total


@router.delete("/concepts/{concept_id}")
def delete_concept(concept_id: int, session: Session = Depends(get_session)) -> dict:
    concept = session.get(LearningConcept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    count = _delete_concept_tree(session, concept_id)
    session.commit()
    return {"ok": True, "deleted": count}


# ------------------------------------------------ concept links (PRD §5.6)


class ConceptLinkCreate(BaseModel):
    kind: str
    ref_id: int | None = None
    ref_path: str = ""


def _resolve_link(session: Session, link: ConceptLink) -> dict:
    """Resolve a link to a displayable {title, subtitle, url|path} object."""
    base = {
        "id": link.id,
        "kind": link.kind,
        "created_at": link.created_at.isoformat() if link.created_at else "",
    }
    if link.kind == "paper":
        obj = session.get(Paper, link.ref_id)
        if not obj:
            return {**base, "title": "(已删除)", "subtitle": "", "url": "/literature"}
        return {
            **base,
            "title": obj.title,
            "subtitle": f"{obj.authors} {obj.year}".strip(),
            "url": "/literature",
        }
    if link.kind == "project":
        obj = session.get(Project, link.ref_id)
        if not obj:
            return {**base, "title": "(已删除)", "subtitle": "", "url": "/research"}
        return {
            **base,
            "title": obj.title,
            "subtitle": obj.description or "",
            "url": f"/research/projects/{obj.id}",
        }
    if link.kind == "experiment":
        obj = session.get(Experiment, link.ref_id)
        if not obj:
            return {**base, "title": "(已删除)", "subtitle": "", "url": "/research"}
        return {
            **base,
            "title": obj.title,
            "subtitle": obj.objective or "",
            "url": f"/research/projects/{obj.project_id}" if obj.project_id else "/research",
        }
    if link.kind == "question":
        obj = session.get(ResearchQuestion, link.ref_id)
        if not obj:
            return {**base, "title": "(已删除)", "subtitle": "", "url": "/research"}
        return {
            **base,
            "title": obj.title,
            "subtitle": obj.description or "",
            "url": f"/research/projects/{obj.project_id}" if obj.project_id else "/research",
        }
    # note: vault-relative path
    if link.ref_path:
        title = Path(link.ref_path).stem
        try:
            meta = frontmatter.loads(
                (_vault() / link.ref_path).read_text("utf-8", errors="ignore")
            ).metadata or {}
            title = str(meta.get("title") or title)
        except Exception:
            pass
        return {
            **base,
            "title": title,
            "subtitle": link.ref_path,
            "path": link.ref_path,
        }
    return {**base, "title": "(已删除)", "subtitle": "", "path": ""}


@router.get("/concepts/{concept_id}/links")
def list_concept_links(
    concept_id: int, session: Session = Depends(get_session)
) -> list[dict]:
    if not session.get(LearningConcept, concept_id):
        raise HTTPException(status_code=404, detail="Concept not found")
    links = session.exec(
        select(ConceptLink)
        .where(ConceptLink.concept_id == concept_id)
        .order_by(ConceptLink.created_at.desc())
    ).all()
    return [_resolve_link(session, link) for link in links]


@router.post("/concepts/{concept_id}/links", status_code=201)
def create_concept_link(
    concept_id: int,
    body: ConceptLinkCreate,
    session: Session = Depends(get_session),
) -> dict:
    if not session.get(LearningConcept, concept_id):
        raise HTTPException(status_code=404, detail="Concept not found")
    if body.kind not in CONCEPT_LINK_KINDS:
        raise HTTPException(status_code=422, detail="invalid kind")
    if body.kind == "note":
        if not body.ref_path:
            raise HTTPException(status_code=422, detail="ref_path required for notes")
        target_id = None
    else:
        if body.ref_id is None:
            raise HTTPException(status_code=422, detail="ref_id required")
        target_id = body.ref_id
        model = {
            "paper": Paper,
            "project": Project,
            "experiment": Experiment,
            "question": ResearchQuestion,
        }[body.kind]
        if not session.get(model, target_id):
            raise HTTPException(status_code=422, detail=f"{body.kind} not found")
    dup = session.exec(
        select(ConceptLink).where(
            ConceptLink.concept_id == concept_id,
            ConceptLink.kind == body.kind,
            ConceptLink.ref_id == target_id,
            ConceptLink.ref_path == (body.ref_path if body.kind == "note" else ""),
        )
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="already linked")
    link = ConceptLink(
        concept_id=concept_id,
        kind=body.kind,
        ref_id=target_id,
        ref_path=body.ref_path if body.kind == "note" else "",
    )
    session.add(link)
    session.commit()
    session.refresh(link)
    return _resolve_link(session, link)


@router.delete("/links/{link_id}")
def delete_concept_link(link_id: int, session: Session = Depends(get_session)) -> dict:
    link = session.get(ConceptLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    session.delete(link)
    session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- check-in

class SessionCreate(BaseModel):
    topic: str
    duration_min: int
    status: str = "completed"
    notes: str = ""
    reflections: str = ""
    takeaways: str = ""
    session_date: str | None = None


@router.get("/sessions")
def list_sessions(
    month: str | None = None,
    limit: int = 60,
    session: Session = Depends(get_session),
) -> list[StudySession]:
    q = select(StudySession).order_by(StudySession.session_date.desc())
    if month:
        q = q.where(StudySession.session_date.startswith(month))
    return session.exec(q.limit(limit)).all()


@router.post("/sessions", status_code=201)
def create_session(
    body: SessionCreate, session: Session = Depends(get_session)
) -> StudySession:
    topic = body.topic.strip()
    if not topic:
        raise HTTPException(status_code=422, detail="topic must not be empty")
    if body.status not in SESSION_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    item = StudySession(
        topic=topic,
        duration_min=body.duration_min,
        status=body.status,
        notes=body.notes,
        reflections=body.reflections,
        takeaways=body.takeaways,
        session_date=body.session_date or date.today().isoformat(),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    add_timeline_event(
        session, "learning.checkin", f"学习打卡：{topic}", detail=f"{item.duration_min} min"
    )
    return item


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, session: Session = Depends(get_session)) -> dict:
    item = session.get(StudySession, session_id)
    if not item:
        raise HTTPException(status_code=404, detail="Study session not found")
    session.delete(item)
    session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- notes (vault)

def _vault() -> Path:
    return Path(get_user_setting("vault_path", "") or "")


def _notes_dir() -> Path:
    return _vault() / "learning"


class NoteCreate(BaseModel):
    title: str
    content: str = ""


@router.get("/notes")
def list_notes() -> list[dict]:
    vault = _vault()
    out: list[dict] = []
    if not vault.exists():
        return out
    for p in vault.rglob("*.md"):
        if p.name.startswith("."):
            continue
        text = _read(p)
        meta = {}
        try:
            meta = frontmatter.loads(text).metadata or {}
        except Exception:
            pass
        is_learning = p.relative_to(vault).parts[0] == "learning" or meta.get(
            "type"
        ) == "learning"
        if not is_learning:
            continue
        out.append(
            {
                "path": str(p),
                "title": str(meta.get("title") or p.stem),
                "relative": p.relative_to(vault).as_posix(),
                "created": str(meta.get("created") or ""),
            }
        )
    out.sort(key=lambda n: n["created"], reverse=True)
    return out


@router.post("/notes", status_code=201)
def create_note(
    body: NoteCreate, session: Session = Depends(get_session)
) -> dict:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    vault = _vault()
    if not vault.exists():
        raise HTTPException(status_code=404, detail="Vault path not configured or missing")
    notes_dir = _notes_dir()
    notes_dir.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", title).strip("-") or "note"
    path = notes_dir / f"{slug}.md"
    n = 1
    while path.exists():
        n += 1
        path = notes_dir / f"{slug}-{n}.md"
    content = (
        f"---\ntitle: {title}\ntype: learning\ncreated: {date.today().isoformat()}\n---\n\n"
        f"{body.content.strip()}\n"
    )
    path.write_text(content, "utf-8")
    add_timeline_event(
        session, event_type="learning.note", title=f"学习笔记：{title}"
    )
    return {"path": str(path), "relative": path.relative_to(vault).as_posix()}


# ---------------------------------------------------------------- calendar

@router.get("/calendar")
def calendar(
    month: str,
    tz_offset_minutes: int = Query(0, description="Client UTC offset in minutes (UTC+8 = -480)"),
    session: Session = Depends(get_session),
) -> dict:
    """Events for a YYYY-MM month: tasks by due date, check-ins, focus."""
    tasks = session.exec(
        select(Task).where(Task.due_date.startswith(month))
    ).all()
    sessions = session.exec(
        select(StudySession).where(StudySession.session_date.startswith(month))
    ).all()
    schedules = session.exec(
        select(ScheduleItem).where(ScheduleItem.date.startswith(month))
    ).all()
    start, end = month_bounds_utc(month, tz_offset_minutes)
    focus = session.exec(
        select(FocusSession).where(
            FocusSession.ended_at >= start, FocusSession.ended_at < end
        )
    ).all()
    return {
        "month": month,
        "tasks": [t.model_dump(mode="json") for t in tasks],
        "sessions": [s.model_dump(mode="json") for s in sessions],
        "schedule": [s.model_dump(mode="json") for s in schedules],
        "focus": [f.model_dump(mode="json") for f in focus],
    }


# ---------------------------------------------------------------- overview

@router.get("/overview")
def overview(session: Session = Depends(get_session)) -> dict:
    concepts = session.exec(select(LearningConcept)).all()
    by_status: dict[str, int] = {}
    for c in concepts:
        by_status[c.status] = by_status.get(c.status, 0) + 1
    recent = session.exec(
        select(StudySession).order_by(StudySession.session_date.desc()).limit(5)
    ).all()
    # weak areas: not-started LEAF concepts (no children), by importance
    has_children = {c.parent_id for c in concepts if c.parent_id is not None}
    weak = [
        c.model_dump(mode="json")
        for c in sorted(
            (
                x
                for x in concepts
                if x.status == "not_started" and x.id not in has_children
            ),
            key=lambda x: (x.sort_order, x.title),
        )[:5]
    ]
    return {
        "progress": {"total": len(concepts), **by_status},
        "recent_sessions": [s.model_dump(mode="json") for s in recent],
        "weak_areas": weak,
    }


def _read(path: Path) -> str:
    try:
        return path.read_text("utf-8", errors="ignore")
    except Exception:
        return ""
