"""System actions: launch macOS apps / open files in external tools.

Used by the command palette ("Open Zotero", "Open Obsidian", ...) and by
search results ("open this note in Obsidian").
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/system", tags=["system"])


class OpenFileIn(BaseModel):
    path: str
    app: str | None = None  # e.g. "Obsidian"


class LaunchAppIn(BaseModel):
    app: str  # macOS app name, e.g. "Zotero", "小绿鲸英文文献阅读器"


@router.post("/open-file")
def open_file(body: OpenFileIn) -> dict:
    p = Path(body.path).expanduser()
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {p}")
    try:
        if body.app:
            subprocess.run(
                ["open", "-a", body.app, str(p)], check=True, timeout=10
            )
        else:
            subprocess.run(["open", str(p)], check=True, timeout=10)
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Failed to open: {exc}")


@router.post("/launch-app")
def launch_app(body: LaunchAppIn) -> dict:
    try:
        subprocess.run(["open", "-a", body.app], check=True, timeout=10)
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail=f"Failed to launch {body.app}: {exc}"
        )
