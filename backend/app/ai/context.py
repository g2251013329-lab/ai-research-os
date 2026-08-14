"""Context pack builder: turn a research object into a compact AI prompt."""
from __future__ import annotations

from pathlib import Path

import frontmatter
from sqlmodel import Session, select

from ..core.user_settings import get_user_setting
from ..models import (
    Experiment,
    Hypothesis,
    LearningConcept,
    Paper,
    PaperQuestion,
    Project,
    ResearchQuestion,
)
from .memory import memory_context


def _vault() -> Path:
    return Path(get_user_setting("vault_path", "") or "")


def _notes_for(project_id: int | None, question_id: int | None) -> str:
    vault = _vault()
    if not vault.exists():
        return ""
    out: list[str] = []
    for p in (vault / "research").rglob("*.md") if (vault / "research").exists() else []:
        try:
            meta = frontmatter.loads(p.read_text("utf-8", errors="ignore")).metadata or {}
        except Exception:
            continue
        if meta.get("type") != "research":
            continue
        if project_id is not None and str(meta.get("project")) != str(project_id):
            continue
        if question_id is not None and str(meta.get("question")) != str(question_id):
            continue
        out.append(f"- {meta.get('title', p.stem)}")
    return "\n".join(out[:15])


def build_context(session: Session, obj_type: str, obj_id: int) -> str:
    """Compact context text for the given research object."""
    parts: list[str] = [memory_context(session)]

    if obj_type == "project":
        p = session.get(Project, obj_id)
        if not p:
            return parts[0]
        parts.append(f"## 项目：{p.title}\n{p.description or '（无描述）'}")
        rqs = session.exec(
            select(ResearchQuestion).where(ResearchQuestion.project_id == obj_id)
        ).all()
        if rqs:
            parts.append("## 研究问题")
            for rq in rqs:
                hyps = session.exec(
                    select(Hypothesis).where(Hypothesis.question_id == rq.id)
                ).all()
                hyp_lines = (
                    "；假设: "
                    + "; ".join(f"{h.description[:80]} [{h.status}]" for h in hyps)
                    if hyps
                    else ""
                )
                parts.append(f"- [{rq.status}] {rq.title}{hyp_lines}")
        exps = session.exec(
            select(Experiment).where(Experiment.project_id == obj_id)
        ).all()
        if exps:
            parts.append("## 实验")
            for e in exps[:8]:
                parts.append(f"- [{e.status}] {e.title}")
        papers = session.exec(
            select(Paper).where(Paper.project_id == obj_id)
        ).all()
        if papers:
            parts.append("## 文献")
            for pa in papers[:10]:
                parts.append(f"- {pa.year} {pa.title} ({pa.authors[:40]})")
        notes = _notes_for(obj_id, None)
        if notes:
            parts.append(f"## 研究笔记\n{notes}")

    elif obj_type == "question":
        rq = session.get(ResearchQuestion, obj_id)
        if not rq:
            return parts[0]
        parts.append(f"## 研究问题：{rq.title}\n{rq.description or ''} [状态 {rq.status}]")
        hyps = session.exec(
            select(Hypothesis).where(Hypothesis.question_id == obj_id)
        ).all()
        if hyps:
            parts.append("## 假设")
            for h in hyps:
                parts.append(
                    f"- [{h.status}] {h.description}\n  证据: {h.evidence or '无'}"
                    f"\n  支持: {h.supporting or '无'}"
                    f"\n  矛盾: {h.contradicting or '无'}"
                )
        exps = session.exec(
            select(Experiment).where(Experiment.question_id == obj_id)
        ).all()
        if exps:
            parts.append("## 实验")
            for e in exps:
                parts.append(f"- [{e.status}] {e.title}: {e.objective or ''}")
        linked = session.exec(
            select(PaperQuestion.paper_id).where(
                PaperQuestion.question_id == obj_id
            )
        ).all()
        if linked:
            papers = session.exec(select(Paper).where(Paper.id.in_(linked))).all()
            parts.append("## 相关文献")
            for pa in papers:
                parts.append(f"- {pa.year} {pa.title} ({pa.authors[:40]})")
        notes = _notes_for(None, obj_id)
        if notes:
            parts.append(f"## 研究笔记\n{notes}")

    elif obj_type == "experiment":
        e = session.get(Experiment, obj_id)
        if not e:
            return parts[0]
        parts.append(
            f"## 实验：{e.title} [状态 {e.status}]\n"
            f"目标: {e.objective or '无'}\n"
            f"假设: {e.hypothesis_text or '无'}\n"
            f"材料: {e.materials or '无'}\n"
            f"方案: {e.protocol or '无'}\n"
            f"变量: {e.variables or '无'}\n"
            f"步骤: {e.procedure or '无'}\n"
            f"原始数据: {e.raw_data or '无'}\n"
            f"结果: {e.results or '无'}\n"
            f"图表: {e.figures or '无'}\n"
            f"解释: {e.interpretation or '无'}\n"
            f"问题: {e.problems or '无'}\n"
            f"下一步: {e.next_step or '无'}"
        )

    elif obj_type == "paper":
        p = session.get(Paper, obj_id)
        if not p:
            return parts[0]
        parts.append(
            f"## 文献：{p.title}\n"
            f"{p.authors} {p.year} {p.journal}\n"
            f"DOI: {p.doi or '无'} 链接: {p.url or '无'}\n"
            f"摘要: {p.abstract or '无'}"
        )
        pdf_text = _paper_pdf_text(p)
        if pdf_text:
            parts.append(f"## PDF 正文摘录（前 {len(pdf_text)} 字符）\n{pdf_text}")

    elif obj_type == "concept":
        c = session.get(LearningConcept, obj_id)
        if not c:
            return parts[0]
        parts.append(f"## 学习概念：{c.title} [状态 {c.status}]\n{c.description or ''}")
        children = session.exec(
            select(LearningConcept).where(LearningConcept.parent_id == obj_id)
        ).all()
        if children:
            parts.append("## 子概念\n" + "\n".join(f"- {x.title}" for x in children))

    return "\n\n".join(parts)


def _paper_pdf_text(paper: Paper) -> str:
    """Extract text from the paper's Zotero PDF attachment (first ~12k chars)."""
    if not paper.zotero_key:
        return ""
    zdir = Path(get_user_setting("zotero_path", "~/Zotero")).expanduser()
    storage = zdir / "storage"
    candidates: list[Path] = []
    try:
        import sqlite3

        db = zdir / "zotero.sqlite"
        if db.exists():
            conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=2)
            conn.row_factory = sqlite3.Row
            parent = conn.execute(
                "SELECT itemID FROM items WHERE key = ?", (paper.zotero_key,)
            ).fetchone()
            if parent:
                rows = conn.execute(
                    "SELECT a.path, i.key AS ak FROM itemAttachments a "
                    "JOIN items i ON a.itemID = i.itemID WHERE a.parentItemID = ?",
                    (parent["itemID"],),
                ).fetchall()
                for r in rows:
                    rel = (r["path"] or "").replace("storage:", "")
                    candidates.append(storage / (r["ak"] or "") / rel)
            conn.close()
    except Exception:
        return ""
    for cand in candidates:
        if cand.exists() and cand.suffix.lower() == ".pdf":
            try:
                from pypdf import PdfReader

                reader = PdfReader(str(cand))
                text = ""
                for page in reader.pages[:12]:
                    text += (page.extract_text() or "") + "\n"
                return text[:12000].strip()
            except Exception:
                return ""
    return ""
