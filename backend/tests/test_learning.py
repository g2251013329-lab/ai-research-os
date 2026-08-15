from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TEST_VAULT = Path(__file__).resolve().parents[1] / ".test-data" / "learning-vault"


def test_roadmap_crud():
    # cleanup
    for c in client.get("/api/learning/roadmap").json():
        if not c.get("children"):
            client.delete(f"/api/learning/concepts/{c['id']}")
    for c in client.get("/api/learning/roadmap").json():
        client.delete(f"/api/learning/concepts/{c['id']}")

    top = client.post("/api/learning/concepts", json={"title": "LLPS"}).json()
    child = client.post(
        "/api/learning/concepts", json={"title": "Thermodynamics", "parent_id": top["id"]}
    ).json()

    r = client.patch(
        f"/api/learning/concepts/{child['id']}", json={"status": "mastered"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "mastered"

    tree = client.get("/api/learning/roadmap").json()
    assert any(
        n["id"] == top["id"] and any(x["title"] == "Thermodynamics" for x in n["children"])
        for n in tree
    )

    # deleting a parent cascades to children (subtree)
    r = client.delete(f"/api/learning/concepts/{top['id']}")
    assert r.status_code == 200
    assert r.json()["deleted"] == 2
    tree = client.get("/api/learning/roadmap").json()
    assert all(n["id"] != top["id"] for n in tree)
    # invalid status rejected
    child2 = client.post(
        "/api/learning/concepts", json={"title": "Thermo2"}
    ).json()
    assert (
        client.patch(
            f"/api/learning/concepts/{child2['id']}", json={"status": "bogus"}
        ).status_code
        == 422
    )

    client.delete(f"/api/learning/concepts/{child2['id']}")


def test_checkin_and_calendar():
    for s in client.get("/api/learning/sessions").json():
        client.delete(f"/api/learning/sessions/{s['id']}")

    r = client.post(
        "/api/learning/sessions",
        json={
            "topic": "Polymer Physics",
            "duration_min": 52,
            "status": "completed",
            "notes": "Flory-Huggins",
            "takeaways": "chi parameter",
        },
    )
    assert r.status_code == 201
    sid = r.json()["id"]
    assert r.json()["session_date"]  # default today

    today = Path(".").resolve()
    month = r.json()["session_date"][:7]

    cal = client.get("/api/learning/calendar", params={"month": month}).json()
    assert any(s["id"] == sid for s in cal["sessions"])

    # task with due date appears
    t = client.post(
        "/api/tasks", json={"title": "finish lecture", "due_date": f"{month}-15"}
    ).json()
    cal2 = client.get("/api/learning/calendar", params={"month": month}).json()
    assert any(x["title"] == "finish lecture" for x in cal2["tasks"])

    client.delete(f"/api/tasks/{t['id']}")
    client.delete(f"/api/learning/sessions/{sid}")


def test_learning_notes_in_vault():
    TEST_VAULT.mkdir(parents=True, exist_ok=True)
    client.put("/api/settings", json={"vault_path": str(TEST_VAULT)})
    try:
        r = client.post("/api/learning/notes", json={"title": "FRAP 原理笔记"})
        assert r.status_code == 201
        rel = r.json()["relative"]
        assert rel.startswith("learning/")
        assert (TEST_VAULT / rel).exists()

        notes = client.get("/api/learning/notes").json()
        assert any(n["title"] == "FRAP 原理笔记" for n in notes)
    finally:
        client.put("/api/settings", json={"vault_path": "/Users/mathew/ai-research-vault"})


def test_learning_overview_and_dashboard():
    r = client.get("/api/learning/overview")
    assert r.status_code == 200
    data = r.json()
    assert "progress" in data and "weak_areas" in data and "recent_sessions" in data

    d = client.get("/api/dashboard").json()
    assert "concepts" in d["learning"]
    assert "total" in d["learning"]["concepts"]


def test_schedule_crud_and_calendar():
    # cleanup
    for s in client.get("/api/schedule", params={"month": "2026-08"}).json():
        client.delete(f"/api/schedule/{s['id']}")

    r = client.post(
        "/api/schedule",
        json={
            "date": "2026-08-15",
            "start_time": "09:00",
            "end_time": "10:30",
            "title": "组会",
            "kind": "research",
        },
    )
    assert r.status_code == 201
    sid = r.json()["id"]
    assert r.json()["start_time"] == "09:00"

    # invalid time rejected
    assert (
        client.post(
            "/api/schedule",
            json={"date": "2026-08-15", "start_time": "25:00", "title": "x"},
        ).status_code
        == 422
    )

    # calendar includes schedule
    cal = client.get("/api/learning/calendar", params={"month": "2026-08"}).json()
    assert any(s["id"] == sid for s in cal["schedule"])

    # list by date
    day = client.get("/api/schedule", params={"date": "2026-08-15"}).json()
    assert any(s["id"] == sid for s in day)

    # update + delete
    r = client.patch(f"/api/schedule/{sid}", json={"start_time": "11:00"})
    assert r.json()["start_time"] == "11:00"
    assert client.delete(f"/api/schedule/{sid}").status_code == 200


def test_concept_links():
    # cleanup
    for c in client.get("/api/learning/roadmap").json():
        if c["title"].startswith("测试概念"):
            client.delete(f"/api/learning/concepts/{c['id']}")
    for p in client.get("/api/papers", params={"limit": 100}).json():
        if p["title"].startswith("测试论文"):
            client.delete(f"/api/papers/{p['id']}")

    concept = client.post(
        "/api/learning/concepts", json={"title": "测试概念链接"}
    ).json()
    paper = client.post(
        "/api/papers/from-discovery",
        json={"title": "测试论文 FRAP", "authors": "Tester", "year": "2026"},
    ).json()["paper"]

    try:
        # link paper
        r = client.post(
            f"/api/learning/concepts/{concept['id']}/links",
            json={"kind": "paper", "ref_id": paper["id"]},
        )
        assert r.status_code == 201
        link = r.json()
        assert link["title"] == "测试论文 FRAP"

        # duplicate rejected
        assert (
            client.post(
                f"/api/learning/concepts/{concept['id']}/links",
                json={"kind": "paper", "ref_id": paper["id"]},
            ).status_code
            == 409
        )

        # invalid kind / missing ref rejected
        assert (
            client.post(
                f"/api/learning/concepts/{concept['id']}/links",
                json={"kind": "bogus", "ref_id": 1},
            ).status_code
            == 422
        )
        assert (
            client.post(
                f"/api/learning/concepts/{concept['id']}/links",
                json={"kind": "paper"},
            ).status_code
            == 422
        )

        # list shows resolved link
        links = client.get(f"/api/learning/concepts/{concept['id']}/links").json()
        assert any(l["kind"] == "paper" and l["title"] == "测试论文 FRAP" for l in links)

        # delete
        assert client.delete(f"/api/learning/links/{link['id']}").json() == {"ok": True}
        assert client.get(f"/api/learning/concepts/{concept['id']}/links").json() == []
    finally:
        client.delete(f"/api/learning/concepts/{concept['id']}")
        client.delete(f"/api/papers/{paper['id']}")
