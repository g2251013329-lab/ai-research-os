from sqlalchemy import text
from fastapi.testclient import TestClient

from app.core.db import engine
from app.main import app

client = TestClient(app)


def _cleanup():
    """Deterministic wipe of research tables (FK-safe order)."""
    with engine.begin() as conn:
        for table in (
            "paperquestion",
            "experiment",
            "hypothesis",
            "researchquestion",
            "paper",
            "project",
            "timelineevent",
        ):
            conn.execute(text(f"DELETE FROM {table}"))


def test_full_research_loop():
    """Project → Question → Hypothesis → Experiment → result (PRD core model)."""
    _cleanup()

    # project
    r = client.post("/api/projects", json={"title": "Aberrant Condensates in Neurodevelopment"})
    assert r.status_code == 201
    proj = r.json()
    pid = proj["id"]

    # research question
    r = client.post(
        "/api/questions",
        json={"project_id": pid, "title": "How does abnormal condensate formation affect neuronal development?"},
    )
    assert r.status_code == 201
    rq = r.json()
    qid = rq["id"]

    # hypothesis
    r = client.post(
        "/api/hypotheses",
        json={
            "question_id": qid,
            "description": "FUS phase separation drives synaptic dysfunction",
            "supporting": "Paper A, Paper B",
        },
    )
    assert r.status_code == 201
    hyp = r.json()
    hid = hyp["id"]
    assert hyp["status"] == "proposed"

    # experiment linked to question + hypothesis
    r = client.post(
        "/api/experiments",
        json={
            "project_id": pid,
            "question_id": qid,
            "hypothesis_id": hid,
            "title": "FUS FRAP recovery assay",
            "objective": "Measure FUS condensate dynamics",
            "materials": "FUS-EGFP plasmid, U2OS cells",
            "status": "planned",
        },
    )
    assert r.status_code == 201
    exp = r.json()
    eid = exp["id"]

    # update experiment with results
    r = client.patch(
        f"/api/experiments/{eid}",
        json={"status": "completed", "results": "FRAP t1/2 = 2.3s", "interpretation": "Dynamic condensates"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "completed"

    # paper + question link
    r = client.post(
        "/api/papers",
        json={"title": "Phase Separation of FUS", "authors": "Patel et al.", "year": "2015", "project_id": pid},
    )
    assert r.status_code == 201
    paper = r.json()
    assert client.post(f"/api/papers/{paper['id']}/questions", json={"question_id": qid}).status_code == 201
    linked = client.get("/api/papers", params={"question_id": qid}).json()
    assert any(p["id"] == paper["id"] for p in linked)
    assert client.delete(f"/api/papers/{paper['id']}/questions/{qid}").status_code == 200

    # dashboard counts real (hypothesis still proposed at this point)
    dash = client.get("/api/dashboard").json()
    assert dash["counts"]["projects"] >= 1
    assert dash["counts"]["papers"] >= 1
    assert dash["counts"]["experiments"] >= 1
    assert dash["counts"]["open_questions"] >= 1
    assert dash["counts"]["active_hypotheses"] >= 1

    # hypothesis status update
    r = client.patch(f"/api/hypotheses/{hid}", json={"status": "supported"})
    assert r.json()["status"] == "supported"

    # rq status update
    r = client.patch(f"/api/questions/{qid}", json={"status": "testing"})
    assert r.json()["status"] == "testing"

    # lists filter by project/question
    assert any(q["id"] == qid for q in client.get("/api/questions", params={"project_id": pid}).json())
    assert any(h["id"] == hid for h in client.get("/api/hypotheses", params={"question_id": qid}).json())
    assert any(e["id"] == eid for e in client.get("/api/experiments", params={"project_id": pid}).json())

    # project timeline scoped
    events = client.get("/api/timeline", params={"project_id": pid}).json()
    types = {e["event_type"] for e in events}
    assert {"project.created", "rq.created", "hypothesis.created", "experiment.created"} <= types

    _cleanup()


def test_project_delete_cascades():
    _cleanup()
    p = client.post("/api/projects", json={"title": "to delete"}).json()
    q = client.post(
        "/api/questions", json={"project_id": p["id"], "title": "q"}
    ).json()
    h = client.post(
        "/api/hypotheses", json={"question_id": q["id"], "description": "h"}
    ).json()
    e = client.post(
        "/api/experiments",
        json={
            "project_id": p["id"],
            "question_id": q["id"],
            "hypothesis_id": h["id"],
            "title": "exp",
        },
    ).json()
    paper = client.post(
        "/api/papers", json={"title": "keep me", "project_id": p["id"]}
    ).json()

    r = client.delete(f"/api/projects/{p['id']}")
    assert r.status_code == 200

    assert client.get("/api/questions", params={"project_id": p["id"]}).json() == []
    assert client.get("/api/hypotheses", params={"question_id": q["id"]}).json() == []
    assert client.get("/api/experiments", params={"project_id": p["id"]}).json() == []

    # paper kept but unlinked
    papers = client.get("/api/papers").json()
    assert any(
        x["id"] == paper["id"] and x["project_id"] is None for x in papers
    )

    # deleted project gone
    assert all(x["id"] != p["id"] for x in client.get("/api/projects").json())
    _cleanup()
