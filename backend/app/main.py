"""AI Research OS backend entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (register tables before init_db)
from .ai import memory as memory_api
from .api import (
    ai,
    dashboard,
    experiments,
    focus,
    git,
    health,
    hypotheses,
    inbox,
    learning,
    papers,
    projects,
    questions,
    research,
    search,
    settings,
    system,
    tasks,
    timeline,
    zotero,
)
from .core.config import settings as app_settings
from .core.db import Session, engine, init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with Session(engine) as session:
        learning.seed_learning_roadmap(session)
    yield


app = FastAPI(
    title=app_settings.app_name,
    version=app_settings.version,
    lifespan=lifespan,
)

# Local dev only: allow the Vite dev server to call the API directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(settings.router)
app.include_router(search.router)
app.include_router(system.router)
app.include_router(tasks.router)
app.include_router(inbox.router)
app.include_router(focus.router)
app.include_router(timeline.router)
app.include_router(dashboard.router)
app.include_router(learning.router)
app.include_router(projects.router)
app.include_router(questions.router)
app.include_router(hypotheses.router)
app.include_router(papers.router)
app.include_router(experiments.router)
app.include_router(research.router)
app.include_router(zotero.router)
app.include_router(git.router)
app.include_router(ai.router)
app.include_router(memory_api.router)

# Serve the built frontend when it exists (production mode).
_frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=_frontend_dist / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        """SPA fallback: serve real files, otherwise index.html for client routes."""
        candidate = _frontend_dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_frontend_dist / "index.html")
