from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _reset():
    client.delete("/api/tasks/999999")  # no-op safety
    for t in client.get("/api/tasks", params={"limit": 100}).json():
        client.delete(f"/api/tasks/{t['id']}")
    for i in client.get("/api/inbox").json():
        client.delete(f"/api/inbox/{i['id']}")


def test_task_crud_and_timeline():
    _reset()
    # create
    r = client.post("/api/tasks", json={"title": "Read 2 papers", "kind": "learning", "priority": "high"})
    assert r.status_code == 201
    task = r.json()
    tid = task["id"]
    assert task["status"] == "todo"

    # timeline event created
    events = client.get("/api/timeline").json()
    assert any(e["event_type"] == "task.created" and e["title"] == "Read 2 papers" for e in events)

    # complete
    r = client.patch(f"/api/tasks/{tid}", json={"status": "done"})
    assert r.status_code == 200
    assert r.json()["status"] == "done"
    assert r.json()["completed_at"] is not None

    # timeline event for completion
    events = client.get("/api/timeline").json()
    assert any(e["event_type"] == "task.completed" for e in events)

    # reopen
    r = client.patch(f"/api/tasks/{tid}", json={"status": "todo"})
    assert r.json()["completed_at"] is None

    # list filter
    r = client.get("/api/tasks", params={"kind": "learning"})
    assert any(t["id"] == tid for t in r.json())

    # invalid kind rejected
    assert client.post("/api/tasks", json={"title": "x", "kind": "bogus"}).status_code == 422

    client.delete(f"/api/tasks/{tid}")


def test_inbox_crud():
    _reset()
    r = client.post("/api/inbox", json={"kind": "idea", "text": "Maybe test this construct"})
    assert r.status_code == 201
    item = r.json()
    iid = item["id"]

    # empty text rejected
    assert client.post("/api/inbox", json={"text": "  "}).status_code == 422

    r = client.patch(f"/api/inbox/{iid}", json={"status": "done"})
    assert r.json()["status"] == "done"

    assert client.get("/api/inbox", params={"status": "done"}).json()[0]["id"] == iid

    client.delete(f"/api/inbox/{iid}")
    assert client.get(f"/api/inbox").json() == []


def test_focus_and_dashboard():
    _reset()
    r = client.post("/api/focus/sessions", json={"duration_min": 25, "task_title": "FRAP notes"})
    assert r.status_code == 201

    today = client.get("/api/focus/today").json()
    assert today["minutes"] >= 25

    dash = client.get("/api/dashboard").json()
    assert dash["focus_minutes_today"] >= 25
    assert dash["counts"]["projects"] == 0
    assert "today_tasks" in dash and "recent_activity" in dash
    assert any(e["event_type"] == "focus.completed" for e in dash["recent_activity"])

    # task appears in dashboard
    t = client.post("/api/tasks", json={"title": "Analyze experiment #12"}).json()
    dash2 = client.get("/api/dashboard").json()
    assert any(x["title"] == "Analyze experiment #12" for x in dash2["today_tasks"])
    client.delete(f"/api/tasks/{t['id']}")
