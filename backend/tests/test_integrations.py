"""Integration tests: Zotero read/import + vault git sync (local bare remote)."""
from __future__ import annotations

import sqlite3
import subprocess
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TEST_DIR = Path(__file__).resolve().parents[1] / ".test-data"


def _git(args: list[str], cwd: Path) -> str:
    return subprocess.run(
        args, cwd=cwd, capture_output=True, text=True, check=True
    ).stdout


def _make_pdf(text: str) -> bytes:
    """Minimal valid one-page PDF containing `text` (extractable)."""
    content = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET"
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length "
        + str(len(content)).encode()
        + b" >>\nstream\n"
        + content.encode()
        + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objs) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF"
    ).encode()
    return bytes(out)


def _build_zotero_fixture() -> Path:
    """Minimal zotero.sqlite with one journal article + attachment."""
    zdir = TEST_DIR / "zotero-fixture"
    import shutil

    shutil.rmtree(zdir, ignore_errors=True)
    storage = zdir / "storage" / "EFGH5678"
    storage.mkdir(parents=True, exist_ok=True)
    (storage / "paper.pdf").write_bytes(_make_pdf("FUS phase separation dynamics test"))
    db = zdir / "zotero.sqlite"
    conn = sqlite3.connect(db)
    c = conn.cursor()
    c.executescript(
        """
        CREATE TABLE fields(fieldID INTEGER PRIMARY KEY, fieldName TEXT);
        CREATE TABLE itemTypes(itemTypeID INTEGER PRIMARY KEY, typeName TEXT);
        CREATE TABLE items(itemID INTEGER PRIMARY KEY, itemTypeID INTEGER, key TEXT, dateAdded TEXT);
        CREATE TABLE itemData(itemID INTEGER, fieldID INTEGER, valueID INTEGER);
        CREATE TABLE itemDataValues(valueID INTEGER PRIMARY KEY, value TEXT);
        CREATE TABLE creators(creatorID INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT);
        CREATE TABLE itemCreators(itemID INTEGER, creatorID INTEGER, orderIndex INTEGER);
        CREATE TABLE collections(collectionID INTEGER PRIMARY KEY, collectionName TEXT, parentCollectionID INTEGER);
        CREATE TABLE collectionItems(collectionID INTEGER, itemID INTEGER);
        CREATE TABLE itemAttachments(itemID INTEGER, parentItemID INTEGER, path TEXT, contentType TEXT);
        CREATE TABLE itemTags(itemID INTEGER, tagID INTEGER);
        CREATE TABLE tags(tagID INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE deletedItems(itemID INTEGER);
        """
    )
    # fields
    for fid, name in [(1, "title"), (2, "date"), (3, "DOI"), (4, "publicationTitle"), (5, "url"), (6, "abstractNote")]:
        c.execute("INSERT INTO fields VALUES (?,?)", (fid, name))
    c.execute("INSERT INTO itemTypes VALUES (1,'journalArticle')")
    c.execute("INSERT INTO itemTypes VALUES (2,'attachment')")
    c.execute("INSERT INTO items VALUES (1,1,'ABCD1234','2026-01-01 00:00:00')")
    c.execute("INSERT INTO items VALUES (2,2,'EFGH5678','2026-01-01 00:00:00')")
    for fid, val in [
        (1, "Phase Separation of FUS"),
        (2, "2015-06-01"),
        (3, "10.1016/j.cell.2015.05.009"),
        (4, "Cell"),
        (6, "FUS undergoes LLPS"),
    ]:
        c.execute("INSERT INTO itemDataValues VALUES (?,?)", (fid, val))
        c.execute("INSERT INTO itemData VALUES (1,?,?)", (fid, fid))
    c.execute("INSERT INTO creators VALUES (1,'A.','Patel')")
    c.execute("INSERT INTO itemCreators VALUES (1,1,0)")
    c.execute("INSERT INTO collections VALUES (1,'LLPS Papers',NULL)")
    c.execute("INSERT INTO collectionItems VALUES (1,1)")
    c.execute(
        "INSERT INTO itemAttachments VALUES (2,1,'storage:paper.pdf','application/pdf')"
    )
    c.execute("INSERT INTO tags VALUES (1,'phase-separation')")
    c.execute("INSERT INTO itemTags VALUES (1,1)")
    conn.commit()
    conn.close()
    return zdir


def _restore_zotero_setting() -> None:
    client.put("/api/settings", json={"zotero_path": "~/Zotero"})


def test_zotero_flow():
    zdir = _build_zotero_fixture()
    client.put("/api/settings", json={"zotero_path": str(zdir)})
    try:
        st = client.get("/api/zotero/status").json()
        assert st["db_exists"] is True

        cols = client.get("/api/zotero/collections").json()
        assert any(c["name"] == "LLPS Papers" for c in cols)

        items = client.get("/api/zotero/items").json()
        assert len(items) == 1
        item = items[0]
        assert item["title"] == "Phase Separation of FUS"
        assert item["authors"] == "Patel A."
        assert item["tags"] == ["phase-separation"]

        # search filter
        found = client.get("/api/zotero/items", params={"q": "FUS"}).json()
        assert len(found) == 1
        assert client.get("/api/zotero/items", params={"q": "nonsense"}).json() == []

        # attachments resolve to real pdf path
        atts = client.get(f"/api/zotero/items/{item['key']}/attachments").json()
        assert len(atts) == 1
        assert Path(atts[0]["path"]).exists()

        # import → Paper created with zotero_key + project
        proj = client.post("/api/projects", json={"title": "Zotero test project"}).json()
        r = client.post(
            "/api/zotero/import",
            json={"keys": [item["key"]], "project_id": proj["id"]},
        )
        assert r.status_code == 201
        assert r.json()["created"] == 1

        papers = client.get("/api/papers", params={"project_id": proj["id"]}).json()
        assert any(p["title"] == "Phase Separation of FUS" and p["zotero_key"] == "ABCD1234" for p in papers)

        # dedupe on second import
        r2 = client.post("/api/zotero/import", json={"keys": [item["key"]]})
        assert r2.json()["created"] == 0
        assert r2.json()["skipped"] == 1

        # cleanup
        for p in client.get("/api/papers").json():
            client.delete(f"/api/papers/{p['id']}")
        client.delete(f"/api/projects/{proj['id']}")
    finally:
        _restore_zotero_setting()


def test_paper_pdf_text_extraction():
    """The PDF attachment text feeds AI summaries (pypdf)."""
    zdir = _build_zotero_fixture()
    client.put("/api/settings", json={"zotero_path": str(zdir)})
    try:
        from app.ai.context import _paper_pdf_text
        from app.models import Paper

        paper = Paper(zotero_key="ABCD1234")
        text = _paper_pdf_text(paper)
        assert "FUS phase separation dynamics test" in text
    finally:
        _restore_zotero_setting()


def test_git_sync_flow():
    vault = TEST_DIR / "vault-git"
    remote = TEST_DIR / "vault-git-remote.git"
    import shutil

    shutil.rmtree(vault, ignore_errors=True)
    shutil.rmtree(remote, ignore_errors=True)

    vault.mkdir(parents=True)
    _git(["git", "init", "-b", "main"], vault)
    _git(["git", "config", "user.name", "test"], vault)
    _git(["git", "config", "user.email", "test@test"], vault)
    (vault / "note.md").write_text("hello", "utf-8")
    _git(["git", "add", "-A"], vault)
    _git(["git", "commit", "-m", "init"], vault)
    subprocess.run(
        ["git", "init", "--bare", "-b", "main", str(remote)],
        cwd=TEST_DIR, capture_output=True, text=True, check=True,
    )
    _git(["git", "remote", "add", "origin", str(remote)], vault)
    _git(["git", "push", "-u", "origin", "main"], vault)

    client.put("/api/settings", json={"vault_path": str(vault)})
    try:
        st = client.get("/api/git/status").json()
        assert st["repo"] is True
        assert st["branch"] == "main"

        # dirty state
        (vault / "note.md").write_text("hello updated", "utf-8")
        st2 = client.get("/api/git/status").json()
        assert st2["dirty_count"] >= 1

        # commit
        r = client.post("/api/git/commit", json={"message": "update note"})
        assert r.status_code == 200
        assert r.json()["committed"] is True

        # sync: commit nothing new → pull → push
        r2 = client.post("/api/git/sync")
        assert r2.status_code == 200
        assert "pushed" in r2.json()["steps"]

        # remote now has the commit
        out = _git(["git", "log", "--oneline", "-1"], remote)
        assert "update note" in out

        # not a repo → friendly error
        client.put("/api/settings", json={"vault_path": str(TEST_DIR / "not-a-repo")})
        st3 = client.get("/api/git/status").json()
        assert st3["repo"] is False
    finally:
        client.put("/api/settings", json={"vault_path": "/Users/mathew/ai-research-vault"})
