"""Papers API (PRD §10): metadata management, linked to projects/questions.

Full Zotero integration arrives in Phase 5; zotero_key is reserved here.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.config import settings as app_settings
from ..core.db import get_session
from ..models import PAPER_STATUSES, Paper, PaperQuestion, Project, ResearchQuestion
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/papers", tags=["papers"])

DOI_RE = re.compile(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.I)


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


class DiscoveryCreate(BaseModel):
    """Paper created from AI literature discovery (not from Zotero)."""

    title: str
    authors: str = ""
    year: str = ""
    journal: str = ""
    doi: str = ""
    url: str = ""
    abstract: str = ""


@router.post("/from-discovery", status_code=201)
def create_from_discovery(
    body: DiscoveryCreate, session: Session = Depends(get_session)
) -> dict:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    doi = (body.doi or "").strip().lower()
    existing = None
    if doi:
        existing = session.exec(select(Paper).where(Paper.doi.ilike(doi))).first()
    if not existing:
        existing = session.exec(select(Paper).where(Paper.title == title)).first()
    if existing:
        return {"paper": existing.model_dump(mode="json"), "created": False}
    paper = Paper(**body.model_dump())
    session.add(paper)
    session.commit()
    session.refresh(paper)
    add_timeline_event(session, "paper.added", f"文献发现导入：{title[:60]}")
    return {"paper": paper.model_dump(mode="json"), "created": True}


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


# ------------------------------------------------------------ drag & drop PDF

def _extract_doi_from_pdf(path: Path) -> str:
    """DOI from PDF embedded metadata, then from first pages' text."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        meta = reader.metadata or {}
        for key in ("/WPS-ARTICLEDOI", "/DOI", "/doi"):
            val = str(meta.get(key) or "").strip()
            m = DOI_RE.search(val)
            if m:
                return m.group(0)
        text = ""
        for page in reader.pages[:3]:
            text += (page.extract_text() or "") + "\n"
        m = DOI_RE.search(text)
        return m.group(0) if m else ""
    except Exception:
        return ""


def _authors_str(authors: list[dict]) -> str:
    names = []
    for a in authors or []:
        name = " ".join(x for x in (a.get("given"), a.get("family")) if x)
        if name:
            names.append(name)
    return "; ".join(names)


def fetch_crossref_metadata(doi: str) -> dict:
    """Best-effort CrossRef enrichment (works when the network allows)."""
    try:
        r = httpx.get(
            f"https://api.crossref.org/works/{doi}", timeout=6
        )
        r.raise_for_status()
        m = r.json()["message"]
        year = ""
        issued = m.get("issued", {}).get("date-parts") or []
        if issued and issued[0]:
            year = str(issued[0][0])
        return {
            "title": (m.get("title") or [""])[0],
            "authors": _authors_str(m.get("author") or []),
            "year": year,
            "journal": (m.get("container-title") or [""])[0],
        }
    except Exception:
        return {}


@router.post("/upload", status_code=201)
async def upload_paper(
    file: UploadFile,
    project_id: int | None = Form(default=None),
    session: Session = Depends(get_session),
) -> dict:
    """Upload a PDF directly: store it locally, extract DOI & best-effort
    CrossRef metadata, and create a Paper record. Deduplicated by DOI."""
    filename = file.filename or "paper.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="仅支持 PDF 文件")
    if project_id is not None and not session.get(Project, project_id):
        raise HTTPException(status_code=422, detail="project not found")

    papers_dir = app_settings.data_dir / "papers"
    papers_dir.mkdir(parents=True, exist_ok=True)
    dest = papers_dir / f"paper-{uuid.uuid4().hex}.pdf"
    dest.write_bytes(await file.read())

    title_from_name = Path(filename).stem.strip() or "未命名文献"
    doi = _extract_doi_from_pdf(dest)

    # dedupe by DOI (or title when no DOI)
    if doi:
        existing = session.exec(select(Paper).where(Paper.doi == doi)).first()
    else:
        existing = session.exec(
            select(Paper).where(Paper.title == title_from_name)
        ).first()
    if existing:
        return {"paper": existing.model_dump(mode="json"), "created": False, "duplicated": True}

    meta = fetch_crossref_metadata(doi) if doi else {}

    paper = Paper(
        title=meta.get("title") or title_from_name,
        authors=meta.get("authors", ""),
        year=meta.get("year", ""),
        journal=meta.get("journal", ""),
        doi=doi,
        url=f"https://doi.org/{doi}" if doi else "",
        project_id=project_id,
        local_path=str(dest),
    )
    session.add(paper)
    session.commit()
    session.refresh(paper)
    add_timeline_event(
        session,
        "paper.added",
        f"上传文献：{paper.title[:60]}",
        project_id=project_id,
    )
    return {"paper": paper.model_dump(mode="json"), "created": True, "duplicated": False}


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
