"""Research notes & writing docs (PRD §12, §15): vault Markdown files."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

import frontmatter
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..core.user_settings import get_user_setting
from ..models import Project
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/research", tags=["research"])


def _vault() -> Path:
    return Path(get_user_setting("vault_path", "") or "")


def _write_note_file(
    folder: str,
    doc_type: str,
    title: str,
    content: str,
    extra_meta: dict,
    session: Session,
    event_type: str,
    project_id: int | None,
) -> dict:
    vault = _vault()
    if not vault.exists():
        raise HTTPException(status_code=404, detail="Vault path not configured or missing")
    target = vault / folder
    target.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", title).strip("-") or "note"
    path = target / f"{slug}.md"
    n = 1
    while path.exists():
        n += 1
        path = target / f"{slug}-{n}.md"
    meta = {"title": title, "type": doc_type, "created": date.today().isoformat()}
    meta.update(extra_meta)
    fm = "\n".join(f"{k}: {v}" for k, v in meta.items())
    path.write_text(f"---\n{fm}\n---\n\n{content.strip()}\n", "utf-8")
    add_timeline_event(
        session,
        event_type,
        f"{doc_type}：{title}",
        project_id=project_id,
    )
    return {
        "path": str(path),
        "relative": path.relative_to(vault).as_posix(),
        "title": title,
        "created": meta["created"],
    }


def _scan_docs(folder: str, doc_type: str, project_id: int | None) -> list[dict]:
    vault = _vault()
    out: list[dict] = []
    if not vault.exists():
        return out
    for p in vault.rglob("*.md"):
        if p.name.startswith("."):
            continue
        rel = p.relative_to(vault).as_posix()
        if not rel.startswith(f"{folder}/"):
            continue
        try:
            post = frontmatter.loads(p.read_text("utf-8", errors="ignore"))
            meta = post.metadata or {}
        except Exception:
            meta = {}
        if meta.get("type") != doc_type:
            continue
        if project_id is not None and str(meta.get("project")) != str(project_id):
            continue
        out.append(
            {
                "path": str(p),
                "relative": rel,
                "title": str(meta.get("title") or p.stem),
                "created": str(meta.get("created") or ""),
                "project": meta.get("project"),
                "question": meta.get("question"),
            }
        )
    out.sort(key=lambda n: n["created"], reverse=True)
    return out


# ---------------------------------------------------------------- notes

class NoteCreate(BaseModel):
    title: str
    content: str = ""
    project_id: int | None = None
    question_id: int | None = None


@router.get("/notes")
def list_notes(project_id: int | None = None) -> list[dict]:
    return _scan_docs("research", "research", project_id)


@router.post("/notes", status_code=201)
def create_note(
    body: NoteCreate, session: Session = Depends(get_session)
) -> dict:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    extra: dict = {}
    if body.project_id is not None:
        if not session.get(Project, body.project_id):
            raise HTTPException(status_code=422, detail="project not found")
        extra["project"] = body.project_id
    if body.question_id is not None:
        extra["question"] = body.question_id
    return _write_note_file(
        "research", "research", title, body.content, extra, session,
        "research.note", body.project_id,
    )


# ---------------------------------------------------------------- writing

class WritingCreate(BaseModel):
    title: str
    content: str = ""
    project_id: int | None = None
    status: str = "draft"


class WritingUpdate(BaseModel):
    content: str | None = None
    status: str | None = None


@router.get("/writing")
def list_writing(project_id: int | None = None) -> list[dict]:
    return _scan_docs("writing", "writing", project_id)


@router.post("/writing", status_code=201)
def create_writing(
    body: WritingCreate, session: Session = Depends(get_session)
) -> dict:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    extra: dict = {"status": body.status}
    if body.project_id is not None:
        if not session.get(Project, body.project_id):
            raise HTTPException(status_code=422, detail="project not found")
        extra["project"] = body.project_id
    return _write_note_file(
        "writing", "writing", title, body.content, extra, session,
        "writing.created", body.project_id,
    )


@router.get("/writing/item")
def get_writing_item(path: str) -> dict:
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        post = frontmatter.loads(p.read_text("utf-8", errors="ignore"))
        return {
            "path": str(p),
            "title": str((post.metadata or {}).get("title") or p.stem),
            "content": post.content,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.patch("/writing/item")
def update_writing_item(body: WritingUpdate, path: str) -> dict:
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        post = frontmatter.loads(p.read_text("utf-8", errors="ignore"))
        meta = dict(post.metadata or {})
        if body.status is not None:
            meta["status"] = body.status
        if body.content is not None:
            post.content = body.content
        fm = "\n".join(f"{k}: {v}" for k, v in meta.items())
        p.write_text(f"---\n{fm}\n---\n\n{post.content.strip()}\n", "utf-8")
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
