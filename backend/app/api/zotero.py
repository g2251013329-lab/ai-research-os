"""Zotero integration (PRD §10.3): read-only access to the local Zotero library.

Two channels, tried in order:
1. Direct read of ``<zotero_path>/zotero.sqlite`` (works when Zotero is closed
   or its DB is in WAL mode).
2. Zotero local HTTP API (http://127.0.0.1:23119) — works while Zotero is
   running and the DB is locked.

Items can be imported into the app as Paper records (deduplicated by DOI /
zotero key), and PDF attachments can be opened in Xiaolvjing (小绿鲸).
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.db import get_session
from ..core.user_settings import get_user_setting
from ..models import Paper, Project
from .timeline import add_timeline_event

router = APIRouter(prefix="/api/zotero", tags=["zotero"])

ITEM_TYPES = (
    "journalArticle",
    "preprint",
    "bookSection",
    "conferencePaper",
    "book",
    "report",
    "thesis",
)

LOCAL_API = "http://127.0.0.1:23119/api"
API_HEADERS = {"Zotero-API-Version": "3"}


def _zotero_dir() -> Path:
    return Path(get_user_setting("zotero_path", "~/Zotero")).expanduser()


def _db_path() -> Path:
    return _zotero_dir() / "zotero.sqlite"


def _connect() -> sqlite3.Connection:
    path = _db_path()
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Zotero database not found at {path}. Check the path in Settings.",
        )
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=2)
    conn.row_factory = sqlite3.Row
    return conn


def _db_locked() -> bool:
    try:
        with _connect() as conn:
            conn.execute("SELECT 1").fetchone()
        return False
    except sqlite3.OperationalError:
        return True


def _api_available() -> bool:
    try:
        r = httpx.get(
            f"{LOCAL_API}/users/0/items",
            headers=API_HEADERS,
            params={"limit": "1"},
            timeout=3,
        )
        return r.status_code == 200
    except Exception:
        return False


def _reader_mode() -> str:
    """'db' (direct sqlite) | 'api' (local HTTP) | 'none' | 'error'."""
    if not _db_path().exists():
        return "none"
    if _db_locked():
        return "api" if _api_available() else "error"
    return "db"


def _api_get(path: str, params: dict | None = None) -> dict:
    try:
        r = httpx.get(
            f"{LOCAL_API}{path}", headers=API_HEADERS, params=params, timeout=10
        )
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Zotero API error: {exc}")


# ---------------------------------------------------------------- status

@router.get("/status")
def status() -> dict:
    zdir = _zotero_dir()
    db = _db_path()
    locked = _db_locked() if db.exists() else False
    return {
        "configured": bool(get_user_setting("zotero_path")),
        "dir_exists": zdir.exists(),
        "db_exists": db.exists(),
        "locked": locked,
        "api_available": _api_available() if locked else False,
        "db_path": str(db),
    }


# ---------------------------------------------------------------- sqlite path

def _field_id(conn: sqlite3.Connection, name: str) -> int | None:
    row = conn.execute(
        "SELECT fieldID FROM fields WHERE fieldName = ?", (name,)
    ).fetchone()
    return row["fieldID"] if row else None


def _item_value(conn: sqlite3.Connection, item_id: int, field_id: int | None) -> str:
    if field_id is None:
        return ""
    row = conn.execute(
        "SELECT v.value FROM itemData d JOIN itemDataValues v "
        "ON d.valueID = v.valueID WHERE d.itemID = ? AND d.fieldID = ?",
        (item_id, field_id),
    ).fetchone()
    return row["value"] if row else ""


def _load_items_db(conn: sqlite3.Connection, item_ids: list[int]) -> list[dict]:
    if not item_ids:
        return []
    placeholders = ",".join("?" * len(item_ids))
    title_f = _field_id(conn, "title")
    date_f = _field_id(conn, "date")
    doi_f = _field_id(conn, "DOI")
    journal_f = _field_id(conn, "publicationTitle")
    url_f = _field_id(conn, "url")
    abstract_f = _field_id(conn, "abstractNote")

    rows = conn.execute(
        f"SELECT i.itemID AS id, i.key, it.typeName AS type "
        f"FROM items i JOIN itemTypes it ON i.itemTypeID = it.itemTypeID "
        f"WHERE i.itemID IN ({placeholders})",
        item_ids,
    ).fetchall()

    creators = conn.execute(
        f"SELECT ic.itemID, c.firstName, c.lastName FROM itemCreators ic "
        f"JOIN creators c ON ic.creatorID = c.creatorID "
        f"WHERE ic.itemID IN ({placeholders}) ORDER BY ic.orderIndex",
        item_ids,
    ).fetchall()
    creators_by_item: dict[int, list[str]] = {}
    for c in creators:
        name = " ".join(x for x in (c["lastName"], c["firstName"]) if x)
        creators_by_item.setdefault(c["itemID"], []).append(name)

    tags = conn.execute(
        f"SELECT it.itemID, t.name FROM itemTags it "
        f"JOIN tags t ON it.tagID = t.tagID "
        f"WHERE it.itemID IN ({placeholders})",
        item_ids,
    ).fetchall()
    tags_by_item: dict[int, list[str]] = {}
    for t in tags:
        tags_by_item.setdefault(t["itemID"], []).append(t["name"])

    out: list[dict[str, Any]] = []
    for r in rows:
        date = _item_value(conn, r["id"], date_f)
        out.append(
            {
                "key": r["key"],
                "title": _item_value(conn, r["id"], title_f),
                "date": date,
                "year": date[:4],
                "journal": _item_value(conn, r["id"], journal_f),
                "doi": _item_value(conn, r["id"], doi_f),
                "url": _item_value(conn, r["id"], url_f),
                "abstract": _item_value(conn, r["id"], abstract_f),
                "authors": "; ".join(creators_by_item.get(r["id"], [])),
                "tags": tags_by_item.get(r["id"], []),
                "type": r["type"],
            }
        )
    return out


def _items_db(collection: str | None, q: str, limit: int) -> list[dict]:
    with _connect() as conn:
        # real papers + orphan PDFs (attachments not attached to another item)
        types_sql = ",".join("?" * len(ITEM_TYPES))
        base = (
            f"SELECT i.itemID AS id, i.key FROM items i "
            f"JOIN itemTypes it ON i.itemTypeID = it.itemTypeID "
            f"WHERE (it.typeName IN ({types_sql}) "
            f"  OR (it.typeName = 'attachment' AND i.itemID NOT IN ("
            f"    SELECT a2.itemID FROM itemAttachments a2 "
            f"    WHERE a2.parentItemID IS NOT NULL AND a2.parentItemID <> a2.itemID))) "
            f"AND i.itemID NOT IN (SELECT itemID FROM deletedItems)"
        )
        params: list[Any] = list(ITEM_TYPES)
        if collection:
            base += " AND i.itemID IN (SELECT itemID FROM collectionItems WHERE collectionID = ?)"
            params.append(collection)
        if q.strip():
            base += (
                " AND i.itemID IN (SELECT d.itemID FROM itemData d "
                "JOIN itemDataValues v ON d.valueID = v.valueID "
                "WHERE v.value LIKE ?)"
            )
            params.append(f"%{q.strip()}%")
        base += " ORDER BY i.dateAdded DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(base, params).fetchall()
        return _load_items_db(conn, [r["id"] for r in rows])


def _collections_db() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT collectionID AS id, collectionName AS name, "
            "parentCollectionID AS parent FROM collections ORDER BY collectionName"
        ).fetchall()
    return [dict(r) for r in rows]


def _attachments_db(key: str) -> list[dict]:
    paths = _attachment_paths_db(key)
    return [{"path": str(p), "filename": p.name} for p in paths]


def _attachment_paths_db(key: str) -> list[Path]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT itemID FROM items WHERE key = ?", (key,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        item_id = row["itemID"]
        # children attachments + the item itself (when it IS an attachment)
        rows = conn.execute(
            "SELECT a.path, i.key AS attachment_key "
            "FROM itemAttachments a JOIN items i ON a.itemID = i.itemID "
            "WHERE a.parentItemID = ? OR a.itemID = ?",
            (item_id, item_id),
        ).fetchall()
    storage = _zotero_dir() / "storage"
    out: list[Path] = []
    for a in rows:
        candidate = _resolve_attachment_path(a["path"], a["attachment_key"], storage)
        if candidate and candidate.suffix.lower() in (".pdf",):
            out.append(candidate)
    return out


def _resolve_attachment_path(
    path: str, attachment_key: str, storage: Path
) -> Path | None:
    """Resolve a Zotero attachment path.

    - ``storage:file.pdf`` → storage/<attachment key>/file.pdf (imported file)
    - absolute path → used as-is (linked file)
    - relative path without storage: prefix → storage/<attachment key>/<path>
    """
    rel = (path or "").replace("storage:", "")
    if not rel:
        return None
    if rel.startswith("/"):
        candidate = Path(rel)
    else:
        candidate = storage / (attachment_key or "") / rel
    return candidate if candidate.exists() else None


# ---------------------------------------------------------------- API path

def _authors_api(creators: list[dict]) -> str:
    names = []
    for c in creators or []:
        name = " ".join(x for x in (c.get("lastName"), c.get("firstName")) if x)
        if name:
            names.append(name)
    return "; ".join(names)


def _items_api(collection: str | None, q: str, limit: int) -> list[dict]:
    params: dict[str, Any] = {"limit": str(limit), "sort": "dateAdded", "direction": "desc"}
    if q.strip():
        params["q"] = q.strip()
    if collection:
        params["collectionKey"] = collection
    data = _api_get("/users/0/items", params)
    out: list[dict[str, Any]] = []
    for entry in data or []:
        d = entry.get("data", {})
        item_type = d.get("itemType", "")
        # only real papers + orphan PDFs (PDFs without a parent entry)
        if item_type in ITEM_TYPES:
            keep = True
        elif item_type == "attachment":
            keep = not d.get("parentItem")
        else:
            keep = False
        if not keep:
            continue
        date = d.get("date") or ""
        out.append(
            {
                "key": entry.get("key", ""),
                "title": d.get("title", ""),
                "date": date,
                "year": date[:4],
                "journal": d.get("publicationTitle", ""),
                "doi": d.get("DOI", ""),
                "url": d.get("url", ""),
                "abstract": d.get("abstractNote", ""),
                "authors": _authors_api(d.get("creators")),
                "tags": [t.get("tag", "") for t in d.get("tags", [])],
                "type": item_type,
            }
        )
    return out


def _collections_api() -> list[dict]:
    data = _api_get("/users/0/collections")
    return [
        {
            "id": int(entry.get("key", "0") or 0),
            "name": entry.get("data", {}).get("name", ""),
            "parent": None,
            "api_key": entry.get("key", ""),
        }
        for entry in data or []
    ]


def _attachments_api(key: str) -> list[dict]:
    paths = _attachment_paths_api(key)
    return [{"path": str(p), "filename": p.name} for p in paths]


def _attachment_paths_api(key: str) -> list[Path]:
    storage = _zotero_dir() / "storage"
    out: list[Path] = []
    # children attachments
    try:
        data = _api_get(f"/users/0/items/{key}/children")
    except HTTPException:
        data = []
    for entry in data or []:
        d = entry.get("data", {})
        filename = d.get("filename") or ""
        link_mode = d.get("linkMode") or ""
        if not filename.lower().endswith(".pdf"):
            continue
        candidate: Path | None = None
        if link_mode == "linked_file" and (d.get("path") or "").startswith("/"):
            candidate = Path(d["path"])
        else:
            candidate = storage / entry.get("key", "") / filename
        if candidate and candidate.exists():
            out.append(candidate)
    if out:
        return out
    # the item itself may BE an attachment (PDF imported without a parent entry)
    try:
        item = _api_get(f"/users/0/items/{key}")
        d = item.get("data", item) if isinstance(item, dict) else {}
    except HTTPException:
        return out
    if d.get("itemType") == "attachment" and (d.get("contentType") or "").lower() == "application/pdf":
        filename = d.get("filename") or ""
        if filename:
            if (d.get("linkMode") or "") == "linked_file" and (d.get("path") or "").startswith("/"):
                candidate = Path(d["path"])
            else:
                candidate = storage / key / filename
            if candidate and candidate.exists():
                out.append(candidate)
    return out


def resolve_pdf_paths(key: str) -> list[Path]:
    """Mode-aware attachment resolution (used by the attachments API and AI)."""
    mode = _reader_mode()
    if mode == "api":
        return _attachment_paths_api(key)
    if mode == "db":
        return _attachment_paths_db(key)
    # none / error: last resort — try the local API directly
    try:
        return _attachment_paths_api(key)
    except HTTPException:
        return []


# ---------------------------------------------------------------- endpoints

@router.get("/collections")
def collections() -> list[dict]:
    mode = _reader_mode()
    if mode == "api":
        return _collections_api()
    if mode == "db":
        return _collections_db()
    if mode == "error":
        raise HTTPException(
            status_code=503,
            detail="Zotero library is locked (Zotero is running) and its local API is unavailable.",
        )
    raise HTTPException(status_code=404, detail="Zotero database not found")


@router.get("/items")
def items(collection: str | None = None, q: str = "", limit: int = 50) -> list[dict]:
    mode = _reader_mode()
    if mode == "api":
        return _items_api(collection, q, limit)
    if mode == "db":
        return _items_db(collection, q, limit)
    if mode == "error":
        raise HTTPException(
            status_code=503,
            detail="Zotero library is locked (Zotero is running) and its local API is unavailable.",
        )
    raise HTTPException(status_code=404, detail="Zotero database not found")


@router.get("/items/{key}/attachments")
def attachments(key: str) -> list[dict]:
    mode = _reader_mode()
    if mode == "api":
        return _attachments_api(key)
    if mode == "db":
        return _attachments_db(key)
    if mode == "error":
        raise HTTPException(status_code=503, detail="Zotero library is locked")
    raise HTTPException(status_code=404, detail="Zotero database not found")


def get_item_by_key(key: str) -> dict | None:
    """Public helper: single item by key (used by AI context builder)."""
    mode = _reader_mode()
    if mode == "none" or mode == "error":
        return None
    if mode == "api":
        try:
            data = _api_get(f"/users/0/items/{key}")
            entry = data if isinstance(data, dict) else (data[0] if data else {})
            d = entry.get("data", {})
            date = d.get("date") or ""
            return {
                "key": entry.get("key", key),
                "title": d.get("title", ""),
                "authors": _authors_api(d.get("creators")),
                "year": date[:4],
                "journal": d.get("publicationTitle", ""),
                "doi": d.get("DOI", ""),
                "url": d.get("url", ""),
                "abstract": d.get("abstractNote", ""),
            }
        except HTTPException:
            return None
    with _connect() as conn:
        row = conn.execute(
            "SELECT itemID FROM items WHERE key = ?", (key,)
        ).fetchone()
        if not row:
            return None
        items = _load_items_db(conn, [row["itemID"]])
    return items[0] if items else None


class ImportIn(BaseModel):
    keys: list[str]
    project_id: int | None = None


@router.post("/import", status_code=201)
def import_items(body: ImportIn, session: Session = Depends(get_session)) -> dict:
    """Import Zotero items as Paper records, deduplicated by DOI / key / title."""
    if not body.keys:
        raise HTTPException(status_code=422, detail="keys must not be empty")
    if body.project_id is not None and not session.get(Project, body.project_id):
        raise HTTPException(status_code=422, detail="project not found")

    mode = _reader_mode()
    if mode == "none":
        raise HTTPException(status_code=404, detail="Zotero database not found")
    if mode == "error":
        raise HTTPException(status_code=503, detail="Zotero library is locked")

    if mode == "api":
        imported: list[dict] = []
        for key in body.keys:
            try:
                data = _api_get(f"/users/0/items/{key}")
                entry = data if isinstance(data, dict) else (data[0] if data else {})
                d = entry.get("data", {})
                date = d.get("date") or ""
                imported.append(
                    {
                        "key": entry.get("key", key),
                        "title": d.get("title", ""),
                        "authors": _authors_api(d.get("creators")),
                        "year": date[:4],
                        "journal": d.get("publicationTitle", ""),
                        "doi": d.get("DOI", ""),
                        "url": d.get("url", ""),
                        "abstract": d.get("abstractNote", ""),
                    }
                )
            except HTTPException:
                continue
    else:
        with _connect() as conn:
            placeholders = ",".join("?" * len(body.keys))
            rows = conn.execute(
                f"SELECT itemID, key FROM items WHERE key IN ({placeholders})",
                body.keys,
            ).fetchall()
            items_map = {r["key"]: r["itemID"] for r in rows}
            imported = _load_items_db(conn, list(items_map.values()))

    created = 0
    skipped = 0
    for item in imported:
        doi = (item.get("doi") or "").strip().lower()
        existing = None
        if doi:
            existing = session.exec(select(Paper).where(Paper.doi.ilike(doi))).first()
        if not existing and item["key"]:
            existing = session.exec(
                select(Paper).where(Paper.zotero_key == item["key"])
            ).first()
        if not existing and item["title"]:
            existing = session.exec(
                select(Paper).where(Paper.title == item["title"])
            ).first()
        if existing:
            skipped += 1
            continue
        paper = Paper(
            title=item["title"],
            authors=item["authors"],
            year=item["year"],
            journal=item["journal"],
            doi=item["doi"],
            url=item["url"],
            abstract=item["abstract"],
            project_id=body.project_id,
            zotero_key=item["key"],
        )
        session.add(paper)
        created += 1
    session.commit()
    if created:
        add_timeline_event(
            session,
            "paper.imported",
            f"从 Zotero 导入 {created} 篇文献",
            project_id=body.project_id,
        )
    return {"created": created, "skipped": skipped}
