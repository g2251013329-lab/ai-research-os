from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TEST_VAULT = Path(__file__).resolve().parents[1] / ".test-data" / "vault-test"


def test_search_finds_vault_files():
    TEST_VAULT.mkdir(parents=True, exist_ok=True)
    (TEST_VAULT / "FUS condensates.md").write_text(
        "---\ntitle: FUS Phase Separation Notes\n---\nbody", "utf-8"
    )
    (TEST_VAULT / "LLPS basics.md").write_text("LLPS body", "utf-8")

    client.put("/api/settings", json={"vault_path": str(TEST_VAULT)})
    try:
        # filename match
        r = client.get("/api/search", params={"q": "LLPS"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert results, "expected at least one vault hit"
        assert all(x["type"] == "vault" for x in results)
        assert any(x["title"] == "LLPS basics" for x in results)

        # frontmatter title match wins over filename
        r2 = client.get("/api/search", params={"q": "Phase Separation"})
        results2 = r2.json()["results"]
        hit = next(x for x in results2 if x["title"] == "FUS Phase Separation Notes")
        assert hit["subtitle"].endswith("FUS condensates.md")

        # empty query -> no results
        r3 = client.get("/api/search", params={"q": "  "})
        assert r3.json()["results"] == []
    finally:
        client.put("/api/settings", json={"vault_path": "/Users/mathew/ai-research-vault"})


def test_search_missing_vault_returns_empty():
    client.put("/api/settings", json={"vault_path": "/nonexistent/vault-xyz"})
    try:
        r = client.get("/api/search", params={"q": "anything"})
        assert r.status_code == 200
        assert r.json()["results"] == []
    finally:
        client.put("/api/settings", json={"vault_path": "/Users/mathew/ai-research-vault"})


def test_search_matches_body_content():
    vault = TEST_VAULT / "content-vault"
    vault.mkdir(parents=True, exist_ok=True)
    (vault / "random-name.md").write_text(
        "---\ntitle: 随机标题\n---\n这篇文章讨论了 FUS 蛋白的液液相分离机制", "utf-8"
    )
    client.put("/api/settings", json={"vault_path": str(vault), "extra_vaults": []})
    try:
        r = client.get("/api/search", params={"q": "液液相分离"})
        assert r.status_code == 200
        hits = [x for x in r.json()["results"] if x["id"].endswith("random-name.md")]
        assert hits, "expected body-content match"
    finally:
        client.put("/api/settings", json={"vault_path": "/Users/mathew/ai-research-vault"})


def test_search_extra_vaults():
    main_vault = TEST_VAULT / "main-vault"
    extra_vault = TEST_VAULT / "extra-vault"
    main_vault.mkdir(parents=True, exist_ok=True)
    extra_vault.mkdir(parents=True, exist_ok=True)
    (extra_vault / "FUS condensates.md").write_text("FUS body", "utf-8")
    client.put(
        "/api/settings",
        json={"vault_path": str(main_vault), "extra_vaults": [str(extra_vault)]},
    )
    try:
        r = client.get("/api/search", params={"q": "FUS"})
        assert r.status_code == 200
        hits = [x for x in r.json()["results"] if "extra-vault" in x["subtitle"]]
        assert hits, "expected extra vault hit"
    finally:
        client.put(
            "/api/settings",
            json={"vault_path": "/Users/mathew/ai-research-vault", "extra_vaults": []},
        )


def test_open_file_missing_returns_404():
    r = client.post("/api/system/open-file", json={"path": "/nonexistent/file.pdf"})
    assert r.status_code == 404
