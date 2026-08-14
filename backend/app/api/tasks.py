"""Tasks API (PRD §4.1 / §5.2: Goal→Month→Week→Day→Task)."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..models import TASK_KINDS, TASK_PRIORITIES, TASK_STATUSES, Task, utcnow
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    kind: str = "general"
    priority: str = "medium"
    due_date: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    kind: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None


@router.get("")
def list_tasks(
    status: str | None = None,
    kind: str | None = None,
    limit: int = 50,
    session: Session = Depends(get_session),
) -> list[Task]:
    q = select(Task).order_by(Task.created_at.desc())
    if status:
        q = q.where(Task.status == status)
    if kind:
        q = q.where(Task.kind == kind)
    return session.exec(q.limit(limit)).all()


@router.post("", status_code=201)
def create_task(body: TaskCreate, session: Session = Depends(get_session)) -> Task:
    if body.kind not in TASK_KINDS:
        raise HTTPException(status_code=422, detail=f"kind must be one of {TASK_KINDS}")
    if body.priority not in TASK_PRIORITIES:
        raise HTTPException(status_code=422, detail="invalid priority")
    task = Task(**body.model_dump())
    session.add(task)
    session.commit()
    session.refresh(task)
    add_timeline_event(session, "task.created", task.title, detail=f"kind={task.kind}")
    return task


@router.patch("/{task_id}")
def update_task(
    task_id: int, body: TaskUpdate, session: Session = Depends(get_session)
) -> Task:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data:
        if data["status"] not in TASK_STATUSES:
            raise HTTPException(status_code=422, detail="invalid status")
        task.status = data["status"]
        task.completed_at = utcnow() if data["status"] == "done" else None
        if data["status"] == "done":
            add_timeline_event(session, "task.completed", task.title)
    for key, value in data.items():
        if key != "status":
            setattr(task, key, value)
    task.updated_at = utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)) -> dict:
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return {"ok": True}
