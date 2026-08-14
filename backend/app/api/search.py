"""Global search API (PRD §19): vault Markdown + all app entities."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import frontmatter
from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlmodel import Session, select

from ..core.db import get_session
from ..core.user_settings import get_user_setting
from ..models import (
    Experiment,
    Hypothesis,
    InboxItem,
    LearningConcept,
    Paper,
    Project,
    ResearchQuestion,
    Task,
)

router = APIRouter(prefix="/api/search", tags=["search"])

# Ordered result types; frontend groups by this order.
RESULT_TYPES = (
    "literature",
    "project",
    "question",
    "hypothesis",
    "experiment",
    "note",
    "learning",
    "leisure",
    "inbox",
    "vault",
)


@router.get("")
def search(
    q: str = "",
    limit: int = 20,
    session: Session = Depends(get_session),
) -> dict:
    query = q.strip()
    if not query:
        return {"query": query, "results": []}
    results: list[dict[str, Any]] = []
    results.extend(_search_vaults(query, limit))
    results.extend(_search_db(session, query, limit))
    return {"query": query, "results": results[:limit]}


def _search_db(session: Session, q: str, limit: int) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    like = f"%{q}%"

    def add(result_type: str, id_str: str, title: str, subtitle: str, url: str) -> None:
        if len(out) >= limit:
            return
        out.append(
            {
                "type": result_type,
                "id": id_str,
                "title": title,
                "subtitle": subtitle,
                "url": url,
            }
        )

    # literature
    for p in session.exec(
        select(Paper)
        .where(or_(Paper.title.ilike(like), Paper.authors.ilike(like)))
        .limit(limit)
    ).all():
        add(
            "literature", f"paper:{p.id}", p.title,
            f"{p.authors} {p.year} {p.journal}".strip(), "/literature",
        )
    # projects
    for p in session.exec(
        select(Project).where(or_(Project.title.ilike(like), Project.description.ilike(like))).limit(limit)
    ).all():
        add("project", f"project:{p.id}", p.title, p.description or "", f"/research/projects/{p.id}")
    # questions
    for rq in session.exec(
        select(ResearchQuestion).where(or_(ResearchQuestion.title.ilike(like), ResearchQuestion.description.ilike(like))).limit(limit)
    ).all():
        add("question", f"question:{rq.id}", rq.title, rq.description or "", f"/research/projects/{rq.project_id}")
    # hypotheses
    for h in session.exec(
        select(Hypothesis).where(Hypothesis.description.ilike(like)).limit(limit)
    ).all():
        add("hypothesis", f"hypothesis:{h.id}", h.description[:80], h.evidence or "", "/research")
    # experiments
    for e in session.exec(
        select(Experiment).where(Experiment.title.ilike(like)).limit(limit)
    ).all():
        add("experiment", f"experiment:{e.id}", e.title, e.objective or "", f"/research/projects/{e.project_id}")
    # tasks
    for task in session.exec(
        select(Task).where(or_(Task.title.ilike(like), Task.description.ilike(like))).limit(limit)
    ).all():
        add("note", f"task:{task.id}", task.title, f"任务 · {task.kind}", "/")
    # inbox
    for item in session.exec(
        select(InboxItem).where(InboxItem.text.ilike(like)).limit(limit)
    ).all():
        add("inbox", f"inbox:{item.id}", item.text[:80], f"收件箱 · {item.kind}", "/inbox")
    # learning concepts
    for c in session.exec(
        select(LearningConcept).where(LearningConcept.title.ilike(like)).limit(limit)
    ).all():
        add("learning", f"concept:{c.id}", c.title, c.description or "", "/learning")

    return out


def _configured_vaults() -> list[Path]:
    """Primary vault + extra search vaults from settings."""
    paths: list[str] = [str(get_user_setting("vault_path", "") or "")]
    for p in get_user_setting("extra_vaults", []) or []:
        paths.append(str(p))
    return [Path(p).expanduser() for p in paths if p.strip()]


def _search_vaults(query: str, limit: int) -> list[dict[str, Any]]:
    low = query.lower()
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for vault in _configured_vaults():
        if not vault.exists():
            continue
        for p in vault.rglob("*.md"):
            if p.name.startswith("."):
                continue
            rel = p.relative_to(vault).as_posix()
            # cheap checks first: filename & relative path
            if low in p.stem.lower() or low in rel.lower():
                matches = True
            else:
                title = _file_title(p)
                if low in title.lower():
                    matches = True
                else:
                    matches = low in _file_text(p).lower()
            if not matches:
                continue
            key = str(p)
            if key in seen:
                continue
            seen.add(key)
            out.append(
                {
                    "type": "vault",
                    "id": key,
                    "title": _file_title(p) or p.stem,
                    "subtitle": f"{vault.name}/{rel}",
                    "url": f"/literature?file={p.name}",
                }
            )
            if len(out) >= limit:
                return out
    return out


def _file_text(path: Path) -> str:
    try:
        return path.read_text("utf-8", errors="ignore")
    except Exception:
        return ""


def _file_title(path: Path) -> str:
    try:
        post = frontmatter.loads(_file_text(path))
        title = (post.metadata or {}).get("title")
        return str(title).strip() if title else ""
    except Exception:
        return ""
