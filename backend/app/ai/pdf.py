"""PDF text extraction for AI summaries (shared by paper & zotero contexts)."""
from __future__ import annotations

from pathlib import Path

MAX_PDF_CHARS = 24_000
MAX_PDF_PAGES = 200  # hard safety cap on pages read


def pdf_text_for_zotero_key(key: str, zotero_path: str) -> str:
    """Resolve a Zotero item's PDF attachment and extract sampled text.

    Covers the WHOLE document regardless of length: first pages (abstract /
    intro), the last pages (discussion / conclusions) and evenly-spaced
    samples from the middle, each page labeled with its number.
    """
    zdir = Path(zotero_path).expanduser()
    storage = zdir / "storage"
    candidates: list[Path] = []
    try:
        import sqlite3

        db = zdir / "zotero.sqlite"
        if db.exists():
            conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=2)
            conn.row_factory = sqlite3.Row
            parent = conn.execute(
                "SELECT itemID FROM items WHERE key = ?", (key,)
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
                return _sample_pages(reader, len(reader.pages))
            except Exception:
                return ""
    return ""


def _sample_pages(reader, total: int) -> str:
    """Pick pages covering the whole document, then extract within budget."""
    if total <= 12:
        indices = list(range(total))
    else:
        n = min(total, MAX_PDF_PAGES)
        head = [0, 1]
        tail = [n - 2, n - 1]
        middle_slots = min(24, max(8, n // 4))
        step = max(1, (n - 4) / middle_slots)
        middle = [2 + int(i * step) for i in range(middle_slots)]
        indices = sorted({i for i in head + tail + middle if 0 <= i < n})

    parts: list[str] = []
    budget = MAX_PDF_CHARS
    for i in indices:
        if budget <= 0:
            break
        try:
            page_text = (reader.pages[i].extract_text() or "").strip()
        except Exception:
            continue
        if not page_text:
            continue
        if len(page_text) > budget:
            page_text = page_text[:budget]
        parts.append(f"[第{i + 1}页] {page_text}")
        budget -= len(page_text)
    return "\n\n".join(parts)
