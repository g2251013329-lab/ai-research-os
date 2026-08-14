"""PDF text extraction for AI summaries (shared by paper & zotero contexts).

Attachment resolution is delegated to the Zotero API module, which handles
both direct-sqlite (Zotero closed) and local-API (Zotero running) modes,
self-attachments and linked files.
"""
from __future__ import annotations

MAX_PDF_CHARS = 24_000
MAX_PDF_PAGES = 200  # hard safety cap on pages read


def pdf_text_for_zotero_key(key: str, zotero_path: str) -> str:
    """Resolve a Zotero item's PDF attachment and extract sampled text."""
    from ..api.zotero import resolve_pdf_paths

    paths = resolve_pdf_paths(key)
    for cand in paths:
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(cand))
            return _sample_pages(reader, len(reader.pages))
        except Exception:
            continue
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
