"""Experiments API (PRD §13): structured 13-field records.

Each experiment is also mirrored to the Obsidian vault as a Markdown note
(vault/experiments/) so it is readable in Obsidian — but that folder is
excluded from the vault's GitHub sync via a .gitignore entry, because
experiment records are local-only by design.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..core.user_settings import get_user_setting
from ..models import (
    EXPERIMENT_STATUSES,
    Experiment,
    Hypothesis,
    Project,
    ResearchQuestion,
)
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/experiments", tags=["experiments"])

EXPERIMENT_FIELDS = (
    "objective",
    "hypothesis_text",
    "materials",
    "protocol",
    "variables",
    "procedure",
    "raw_data",
    "results",
    "figures",
    "interpretation",
    "problems",
    "next_step",
)

FIELD_LABELS = {
    "objective": "Objective 目标",
    "hypothesis_text": "Hypothesis 假设",
    "materials": "Materials 材料",
    "protocol": "Protocol 方案",
    "variables": "Variables 变量",
    "procedure": "Procedure 步骤",
    "raw_data": "Raw Data 原始数据",
    "results": "Results 结果",
    "figures": "Figures 图表",
    "interpretation": "Interpretation 解读",
    "problems": "Problems 问题",
    "next_step": "Next Step 下一步",
}


def _vault() -> Path:
    return Path(get_user_setting("vault_path", "") or "")


def _ensure_gitignore(vault: Path) -> None:
    """Keep experiments/ out of the vault's GitHub sync (user requirement)."""
    gi = vault / ".gitignore"
    line = "experiments/"
    try:
        if gi.exists():
            text = gi.read_text("utf-8", errors="ignore")
            if line in text.splitlines():
                return
            text = text.rstrip() + "\n" + line + "\n"
        else:
            text = line + "\n"
        gi.write_text(text, "utf-8")
    except Exception:
        pass


def _sync_to_vault(exp: Experiment) -> None:
    vault = _vault()
    if not vault.exists():
        return
    try:
        folder = vault / "experiments"
        folder.mkdir(parents=True, exist_ok=True)
        _ensure_gitignore(vault)
        slug = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", exp.title).strip("-") or "note"
        path = folder / f"exp-{exp.id}-{slug}.md"
        created = exp.created_at.isoformat() if exp.created_at else ""
        updated = exp.updated_at.isoformat() if exp.updated_at else ""
        meta = [
            f"title: {exp.title}",
            "type: experiment",
            f"status: {exp.status}",
            f"created: {created}",
            f"updated: {updated}",
        ]
        if exp.project_id is not None:
            meta.append(f"project: {exp.project_id}")
        if exp.question_id is not None:
            meta.append(f"question: {exp.question_id}")
        if exp.hypothesis_id is not None:
            meta.append(f"hypothesis: {exp.hypothesis_id}")
        sections = [
            f"## {FIELD_LABELS[f]}\n\n{getattr(exp, f, '')}"
            for f in EXPERIMENT_FIELDS
            if getattr(exp, f, "")
        ]
        body = "\n\n".join(sections) or "_（暂无内容）_"
        path.write_text(
            f"---\n{chr(10).join(meta)}\n---\n\n# {exp.title}\n\n{body}\n",
            "utf-8",
        )
    except Exception:
        pass  # vault sync is best-effort; DB remains the source of truth


def _remove_vault_file(exp: Experiment) -> None:
    vault = _vault()
    if not vault.exists():
        return
    slug = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", exp.title).strip("-") or "note"
    path = vault / "experiments" / f"exp-{exp.id}-{slug}.md"
    try:
        path.unlink(missing_ok=True)
    except Exception:
        pass


class ExperimentCreate(BaseModel):
    project_id: int
    question_id: int | None = None
    hypothesis_id: int | None = None
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


class ExperimentUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    question_id: int | None = None
    hypothesis_id: int | None = None
    objective: str | None = None
    hypothesis_text: str | None = None
    materials: str | None = None
    protocol: str | None = None
    variables: str | None = None
    procedure: str | None = None
    raw_data: str | None = None
    results: str | None = None
    figures: str | None = None
    interpretation: str | None = None
    problems: str | None = None
    next_step: str | None = None


@router.get("")
def list_experiments(
    project_id: int | None = None,
    question_id: int | None = None,
    session: Session = Depends(get_session),
) -> list[Experiment]:
    q = select(Experiment).order_by(Experiment.created_at.desc())
    if project_id is not None:
        q = q.where(Experiment.project_id == project_id)
    if question_id is not None:
        q = q.where(Experiment.question_id == question_id)
    return session.exec(q).all()


@router.post("", status_code=201)
def create_experiment(
    body: ExperimentCreate, session: Session = Depends(get_session)
) -> Experiment:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    if not session.get(Project, body.project_id):
        raise HTTPException(status_code=422, detail="project not found")
    if body.question_id and not session.get(ResearchQuestion, body.question_id):
        raise HTTPException(status_code=422, detail="question not found")
    if body.hypothesis_id and not session.get(Hypothesis, body.hypothesis_id):
        raise HTTPException(status_code=422, detail="hypothesis not found")
    exp = Experiment(**body.model_dump())
    session.add(exp)
    session.commit()
    session.refresh(exp)
    add_timeline_event(
        session, "experiment.created", f"实验：{title}", project_id=body.project_id
    )
    _sync_to_vault(exp)
    return exp


@router.patch("/{experiment_id}")
def update_experiment(
    experiment_id: int,
    body: ExperimentUpdate,
    session: Session = Depends(get_session),
) -> Experiment:
    exp = session.get(Experiment, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data:
        if data["status"] not in EXPERIMENT_STATUSES:
            raise HTTPException(status_code=422, detail="invalid status")
        add_timeline_event(
            session,
            "experiment.status",
            f"实验「{exp.title}」→ {data['status']}",
            project_id=exp.project_id,
        )
    for key, value in data.items():
        setattr(exp, key, value)
    exp.updated_at = datetime.now(timezone.utc)
    session.add(exp)
    session.commit()
    session.refresh(exp)
    _sync_to_vault(exp)
    return exp


@router.delete("/{experiment_id}")
def delete_experiment(
    experiment_id: int, session: Session = Depends(get_session)
) -> dict:
    exp = session.get(Experiment, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    session.delete(exp)
    session.commit()
    _remove_vault_file(exp)
    return {"ok": True}
