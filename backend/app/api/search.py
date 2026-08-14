"""Global search API.

Searches the configured Obsidian vault(s) — filename, relative path, YAML
frontmatter title, and note body content. Future phases plug in literature /
projects / questions / experiments / notes / learning / leisure / inbox
sources with the same result schema.
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
    results.extend(_search_vaults(query, limit))
    # Future sources append here (literature, projects, ...).
    return {"query": query, "results": results[:limit]}


def _configured_vaults() -> list[Path]:
    """Primary vault + extra search vaults from settings."""
    paths: list[str] = [str(get_user_setting("vault_path", "") or "")]
    for p in get_user_setting("extra_vaults", []) or []:
        paths.append(str(p))
    return [Path(p).expanduser() for p in paths if p.strip()]


def _search_vaults(query: str, limit: int) -> list[dict[str, Any]]:
    low = query.lower()
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for vault in _configured_vaults():
        if not vault.exists():
            continue
        for p in vault.rglob("*.md"):
            if p.name.startswith("."):
                continue
            rel = p.relative_to(vault).as_posix()
            # cheap checks first: filename & relative path
            if low in p.stem.lower() or low in rel.lower():
                matches = True
            else:
                title = _file_title(p)
                if low in title.lower():
                    matches = True
                else:
                    matches = low in _file_text(p).lower()
            if not matches:
                continue
            key = str(p)
            if key in seen:
                continue
            seen.add(key)
            out.append(
                {
                    "type": "vault",
                    "id": key,
                    "title": _file_title(p) or p.stem,
                    "subtitle": f"{vault.name}/{rel}",
                    "url": f"/literature?file={p.name}",
                }
            )
            if len(out) >= limit:
                return out
    return out


def _file_text(path: Path) -> str:
    try:
        return path.read_text("utf-8", errors="ignore")
    except Exception:
        return ""


def _file_title(path: Path) -> str:
    try:
        post = frontmatter.loads(_file_text(path))
        title = (post.metadata or {}).get("title")
        return str(title).strip() if title else ""
    except Exception:
        return ""
