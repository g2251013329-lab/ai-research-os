"""Global search API.

Phase 1: searches vault Markdown files (title + frontmatter title).
Future phases plug in literature / projects / questions / experiments /
notes / learning / leisure / inbox sources with the same result schema.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import frontmatter
from fastapi import APIRouter

from ..core.user_settings import get_user_setting

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
def search(q: str = "", limit: int = 20) -> dict:
    query = q.strip()
    if not query:
        return {"query": query, "results": []}
    results: list[dict[str, Any]] = []
    results.extend(_search_vault(query, limit))
    # Future sources append here (literature, projects, ...).
    return {"query": query, "results": results[:limit]}


def _search_vault(query: str, limit: int) -> list[dict[str, Any]]:
    vault = Path(get_user_setting("vault_path", "") or "")
    if not vault.exists():
        return []
    low = query.lower()
    out: list[dict[str, Any]] = []
    for p in vault.rglob("*.md"):
        if p.name.startswith("."):
            continue
        if low in p.stem.lower() or low in _file_title(p).lower():
            out.append(
                {
                    "type": "vault",
                    "id": str(p),
                    "title": _file_title(p) or p.stem,
                    "subtitle": p.relative_to(vault).as_posix(),
                    "url": f"/literature?file={p.name}",
                }
            )
            if len(out) >= limit:
                break
    return out


def _file_title(path: Path) -> str:
    try:
        post = frontmatter.loads(path.read_text("utf-8", errors="ignore"))
        title = (post.metadata or {}).get("title")
        return str(title).strip() if title else ""
    except Exception:
        return ""
