"""Projects API (PRD §7): the main organizational layer."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import PROJECT_STATUSES, Project
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    title: str
    description: str = ""
    color: str = "ocean"


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    color: str | None = None


@router.get("")
def list_projects(session: Session = Depends(get_session)) -> list[Project]:
    return session.exec(
        select(Project).order_by(Project.created_at.desc())
    ).all()


@router.post("", status_code=201)
def create_project(
    body: ProjectCreate, session: Session = Depends(get_session)
) -> Project:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title must not be empty")
    project = Project(title=title, description=body.description, color=body.color)
    session.add(project)
    session.commit()
    session.refresh(project)
    add_timeline_event(
        session, "project.created", f"项目：{title}", project_id=project.id
    )
    return project


@router.patch("/{project_id}")
def update_project(
    project_id: int, body: ProjectUpdate, session: Session = Depends(get_session)
) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in PROJECT_STATUSES:
        raise HTTPException(status_code=422, detail="invalid status")
    for key, value in data.items():
        setattr(project, key, value)
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: int, session: Session = Depends(get_session)) -> dict:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    session.delete(project)
    session.commit()
    return {"ok": True}
