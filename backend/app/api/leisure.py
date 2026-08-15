"""Leisure space API: reading list (books + progress + notes in vault)."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

import frontmatter
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..core.db import get_session
from ..core.user_settings import get_user_setting
from ..models import BOOK_STATUSES, Book
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/leisure", tags=["leisure"])


def _vault() -> Path:
    return Path(get_user_setting("vault_path", "") or "")


def _notes_dir() -> Path:
    return _vault() / "leisure" / "reading"


# ---------------------------------------------------------------- books


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    author: str = ""
    status: str = "planned"
    progress: int = Field(default=0, ge=0, le=100)


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    author: str | None = None
    status: str | None = None
    progress: int | None = Field(default=None, ge=0, le=100)


@router.get("/books")
def list_books(session: Session = Depends(get_session)) -> list[dict]:
    books = session.exec(select(Book).order_by(Book.created_at.desc())).all()
    return [b.model_dump(mode="json") for b in books]


@router.post("/books", status_code=201)
def create_book(
    body: BookCreate, session: Session = Depends(get_session)
) -> dict:
    if body.status not in BOOK_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    book = Book(
        title=body.title.strip(),
        author=body.author.strip(),
        status=body.status,
        progress=100 if body.status == "finished" else body.progress,
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    add_timeline_event(
        session, event_type="leisure.book_added", title=f"加入书架：{book.title}"
    )
    return book.model_dump(mode="json")


@router.patch("/books/{book_id}")
def update_book(
    book_id: int, body: BookUpdate, session: Session = Depends(get_session)
) -> dict:
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data:
        if data["status"] not in BOOK_STATUSES:
            raise HTTPException(status_code=422, detail="invalid status")
        if data["status"] == "finished":
            data["progress"] = 100
    book.sqlmodel_update(data)
    session.add(book)
    session.commit()
    session.refresh(book)
    return book.model_dump(mode="json")


@router.delete("/books/{book_id}")
def delete_book(book_id: int, session: Session = Depends(get_session)) -> dict:
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    session.delete(book)
    session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- reading notes


class ReadingNoteCreate(BaseModel):
    title: str
    content: str = ""
    book: str = ""  # optional book title to tag the note


@router.get("/notes")
def list_reading_notes() -> list[dict]:
    vault = _vault()
    out: list[dict] = []
    if not vault.exists():
        return out
    notes_dir = _notes_dir()
    if not notes_dir.exists():
        return out
    for p in notes_dir.glob("*.md"):
        if p.name.startswith("."):
            continue
        meta = {}
        try:
            meta = frontmatter.loads(p.read_text("utf-8", errors="ignore")).metadata or {}
        except Exception:
            pass
        out.append(
            {
                "path": str(p),
                "title": str(meta.get("title") or p.stem),
                "book": str(meta.get("book") or ""),
                "relative": p.relative_to(vault).as_posix(),
                "created": str(meta.get("created") or ""),
            }
        )
    out.sort(key=lambda n: n["created"], reverse=True)
    return out


@router.post("/notes", status_code=201)
def create_reading_note(
    body: ReadingNoteCreate, session: Session = Depends(get_session)
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
    meta_lines = [f"title: {title}", "type: reading", f"created: {date.today().isoformat()}"]
    if body.book.strip():
        meta_lines.append(f"book: {body.book.strip()}")
    content = f"---\n{chr(10).join(meta_lines)}\n---\n\n{body.content.strip()}\n"
    path.write_text(content, "utf-8")
    add_timeline_event(
        session, event_type="leisure.note_created", title=f"阅读笔记：{title}"
    )
    return {"path": str(path), "relative": path.relative_to(vault).as_posix()}
