"""Leisure space tests: book CRUD + reading notes in the vault."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TEST_VAULT = Path(os.environ.get("AIROS_DATA_DIR", ".")) / "test-vault"
OLD_VAULT = client.get("/api/settings").json().get("vault_path")


def _cleanup():
    for b in client.get("/api/leisure/books").json():
        client.delete(f"/api/leisure/books/{b['id']}")
    notes_dir = TEST_VAULT / "leisure" / "reading"
    if notes_dir.exists():
        for p in notes_dir.glob("*.md"):
            p.unlink()


def test_book_crud_and_notes():
    _cleanup()
    try:
        TEST_VAULT.mkdir(parents=True, exist_ok=True)
        client.put("/api/settings", json={"vault_path": str(TEST_VAULT)})

        # create book
        r = client.post(
            "/api/leisure/books",
            json={"title": "Molecular Biology of the Cell", "author": "Alberts", "status": "reading"},
        )
        assert r.status_code == 201
        book = r.json()
        bid = book["id"]
        assert book["progress"] == 0
        assert book["status"] == "reading"

        # progress update
        r = client.patch(f"/api/leisure/books/{bid}", json={"progress": 42})
        assert r.json()["progress"] == 42

        # finishing forces progress 100
        r = client.patch(f"/api/leisure/books/{bid}", json={"status": "finished"})
        assert r.json()["progress"] == 100

        # invalid status / progress rejected
        assert client.post(
            "/api/leisure/books", json={"title": "x", "status": "bogus"}
        ).status_code == 422
        assert client.patch(f"/api/leisure/books/{bid}", json={"progress": 101}).status_code == 422

        # list + delete
        assert len(client.get("/api/leisure/books").json()) == 1
        assert client.delete(f"/api/leisure/books/{bid}").json() == {"ok": True}
        assert client.get("/api/leisure/books").json() == []

        # reading note in vault
        r = client.post(
            "/api/leisure/notes",
            json={"title": "细胞骨架章节", "content": "微管动力学笔记", "book": "Molecular Biology of the Cell"},
        )
        assert r.status_code == 201
        rel = r.json()["relative"]
        assert rel.startswith("leisure/reading/")
        assert (TEST_VAULT / rel).exists()
        assert "book: Molecular Biology of the Cell" in (TEST_VAULT / rel).read_text("utf-8")

        notes = client.get("/api/leisure/notes").json()
        assert any(n["title"] == "细胞骨架章节" and n["book"] == "Molecular Biology of the Cell" for n in notes)

        # timeline events recorded
        events = client.get("/api/timeline").json()
        titles = [e["title"] for e in events]
        assert any("加入书架" in t for t in titles)
        assert any("阅读笔记" in t for t in titles)
    finally:
        _cleanup()
        client.put("/api/settings", json={"vault_path": OLD_VAULT})
