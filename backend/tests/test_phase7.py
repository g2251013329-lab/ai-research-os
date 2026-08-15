"""Phase 7 tests: cross-source search, graph, stats, discovery/compare (mocked)."""
import json

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_cross_source_search():
    from sqlalchemy import text

    from app.core.db import engine

    with engine.begin() as conn:
        for table in (
            "paperquestion", "experiment", "hypothesis", "researchquestion",
            "paper", "project", "inboxitem", "task", "learningconcept", "timelineevent",
        ):
            conn.execute(text(f"DELETE FROM {table}"))

    p = client.post("/api/projects", json={"title": "FUS condensate project"}).json()
    rq = client.post(
        "/api/questions", json={"project_id": p["id"], "title": "FUS droplet question"}
    ).json()
    e = client.post(
        "/api/experiments", json={"project_id": p["id"], "title": "FUS FRAP assay"}
    ).json()
    paper = client.post(
        "/api/papers", json={"title": "FUS phase separation review", "authors": "A. B."}
    ).json()
    item = client.post("/api/inbox", json={"text": "FUS construct idea"}).json()
    task = client.post("/api/tasks", json={"title": "FUS reading task"}).json()

    r = client.get("/api/search", params={"q": "FUS"})
    assert r.status_code == 200
    types = {x["type"] for x in r.json()["results"]}
    assert {"project", "question", "experiment", "literature", "inbox", "note"} <= types

    # urls for navigation
    results = r.json()["results"]
    proj = next(x for x in results if x["type"] == "project")
    assert proj["url"] == f"/research/projects/{p['id']}"

    for rid in (paper["id"],):
        client.delete(f"/api/papers/{rid}")
    client.delete(f"/api/experiments/{e['id']}")
    client.delete(f"/api/questions/{rq['id']}")
    client.delete(f"/api/inbox/{item['id']}")
    client.delete(f"/api/tasks/{task['id']}")
    client.delete(f"/api/projects/{p['id']}")


def test_graph_and_stats():
    from sqlalchemy import text

    from app.core.db import engine

    with engine.begin() as conn:
        for table in (
            "paperquestion", "experiment", "hypothesis", "researchquestion",
            "paper", "project", "task", "timelineevent",
        ):
            conn.execute(text(f"DELETE FROM {table}"))

    p = client.post("/api/projects", json={"title": "Graph project"}).json()
    rq = client.post(
        "/api/questions", json={"project_id": p["id"], "title": "Graph question"}
    ).json()
    client.post(
        "/api/experiments",
        json={"project_id": p["id"], "question_id": rq["id"], "title": "Graph exp"},
    ).json()
    client.post("/api/papers", json={"title": "Graph paper", "project_id": p["id"]}).json()

    g = client.get("/api/graph").json()
    assert any(n["type"] == "project" for n in g["nodes"])
    assert any(n["type"] == "question" for n in g["nodes"])
    assert any(e["type"] == "has_question" for e in g["edges"])
    assert any(e["type"] == "has_experiment" for e in g["edges"])

    s = client.get("/api/stats").json()
    assert s["papers"]["total"] >= 1
    assert s["experiments"]["total"] >= 1
    assert "resolved" in s["questions"]

    for rid in (p["id"], rq["id"]):
        client.delete(f"/api/projects/{rid}")


def test_discover_and_compare(monkeypatch):
    from app.api import ai as ai_api

    fake_epmc = {
        "resultList": {
            "result": [
                {
                    "title": "FUS phase separation in ALS",
                    "authorString": "Patel A",
                    "pubYear": "2023",
                    "journalTitle": "Nature",
                    "doi": "10.1000/epmc",
                    "source": "MED",
                    "id": "1",
                }
            ]
        }
    }
    fake_s2 = {
        "data": [
            {
                "title": "LLPS and neurodegeneration",
                "authors": [{"name": "Low M"}],
                "year": 2024,
                "journal": {"name": "Cell"},
                "externalIds": {"DOI": "10.1000/s2"},
            }
        ]
    }

    fake_scholar_html = """
    <div class="gs_ri">
      <h3 class="gs_rt"><a href="https://scholar.example/fus">Scholar FUS condensate paper</a></h3>
      <div class="gs_a">John Doe - 2021 - Journal of Phase Separation</div>
      <div class="gs_rs">abstract snippet</div>
    </div>
    <div class="gs_li">ignored</div>
    """

    import httpx

    class FakeResp:
        def __init__(self, payload, text=None):
            self._payload = payload
            self._text = text
            self.status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

        @property
        def text(self):
            return self._text or ""

    calls = {"n": 0}

    def fake_get(url, **kwargs):
        calls["n"] += 1
        if "scholar.google.com" in url:
            return FakeResp(None, text=fake_scholar_html)
        if "europepmc" in url:
            return FakeResp(fake_epmc)
        return FakeResp(fake_s2)

    monkeypatch.setattr(httpx, "get", fake_get)
    monkeypatch.setattr(ai_api.ai, "is_configured", lambda: False)  # skip AI ranking

    r = client.post("/api/ai/discover", json={"query": "FUS phase separation"})
    assert r.status_code == 200
    data = r.json()
    assert data["ai_ranked"] is False
    sources = {x["source"] for x in data["results"]}
    assert sources == {"Europe PMC", "Semantic Scholar", "Google Scholar"}, sources
    scholar = next(x for x in data["results"] if x["source"] == "Google Scholar")
    assert scholar["title"] == "Scholar FUS condensate paper"
    assert scholar["year"] == "2021"
    assert calls["n"] == 3

    # compare needs papers in db
    p1 = client.post("/api/papers", json={"title": "Compare A", "abstract": "FUS"}).json()
    p2 = client.post("/api/papers", json={"title": "Compare B", "abstract": "TDP-43"}).json()

    from app.ai import client as ai_client

    monkeypatch.setattr(ai_client, "complete", lambda *a, **k: "对比结果文本")
    r2 = client.post(
        "/api/ai/compare-papers", json={"paper_ids": [p1["id"], p2["id"]]}
    )
    assert r2.status_code == 200
    assert "对比结果文本" in r2.json()["comparison"]

    client.delete(f"/api/papers/{p1['id']}")
    client.delete(f"/api/papers/{p2['id']}")


def test_onescholar_metrics_and_zone_filter():
    from app.api.ai import _apply_zone_filter, _extract_metrics

    # parsing sample response data (Nature-like)
    m = _extract_metrics(
        {"abbr": "Nature", "imf": 48.5, "jcr": "Q1", "cas": "1区", "cas_top": "中科院 Top"}
    )
    assert m["if"] == 48.5
    assert m["zone"] == 1
    assert m["jcr"] == "Q1"
    assert m["cas_top"] == "中科院 Top"

    # 3区 parsing
    m2 = _extract_metrics({"imf": 4.4, "cas": "3区"})
    assert m2["zone"] == 3

    # unknown
    m3 = _extract_metrics({"imf": "abc", "cas": ""})
    assert m3["if"] is None and m3["zone"] is None

    # zone filter: strict 1区
    items = [
        {"title": "a", "zone": 1},
        {"title": "b", "zone": 1},
        {"title": "c", "zone": 2},
        {"title": "d", "zone": 3},
        {"title": "e"},
    ]
    f, exact = _apply_zone_filter(items, 1)
    assert exact is True and [x["title"] for x in f] == ["a", "b"]

    # relax to 2区 when no 1区
    items2 = [{"title": "x", "zone": 2}, {"title": "y", "zone": 3}]
    f2, exact2 = _apply_zone_filter(items2, 1)
    assert exact2 is False and [x["title"] for x in f2] == ["x"]

    # no zone info at all → keep all
    f3, exact3 = _apply_zone_filter([{"title": "z"}], 1)
    assert exact3 is False and f3[0]["title"] == "z"

    # min_zone=0 disables filtering
    f4, exact4 = _apply_zone_filter(items2, 0)
    assert exact4 is False and len(f4) == 2


def test_discover_enriches_with_onescholar(monkeypatch):
    """Discover results get IF/CAS zone from One Scholar; zone filter applies."""
    from app.api import ai as ai_api

    fake_epmc = {
        "resultList": {
            "result": [
                {
                    "title": "FUS paper in Nature",
                    "authorString": "A",
                    "pubYear": "2023",
                    "journalTitle": "Nature",
                    "doi": "10.1000/nat",
                    "source": "MED",
                    "id": "1",
                },
                {
                    "title": "FUS paper in low journal",
                    "authorString": "B",
                    "pubYear": "2024",
                    "journalTitle": "Some Obscure Journal",
                    "doi": "10.1000/obs",
                    "source": "MED",
                    "id": "2",
                },
            ]
        }
    }

    class FakeResp:
        def __init__(self, payload):
            self._payload = payload
            self.status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

        @property
        def text(self):
            return ""

    import httpx

    def fake_get(url, **kwargs):
        if "europepmc" in url:
            return FakeResp(fake_epmc)
        if "semanticscholar" in url:
            return FakeResp({"data": []})
        if "scholar.google.com" in url:
            return FakeResp(None)
        return FakeResp({})

    monkeypatch.setattr(httpx, "get", fake_get)
    monkeypatch.setattr(ai_api.ai, "is_configured", lambda: False)

    def fake_lookup(journal):
        if "Nature" in journal:
            return {"if": 48.5, "zone": 1, "jcr": "Q1", "cas": "1区", "cas_top": "中科院 Top"}
        return {"if": 1.2, "zone": 4, "jcr": "Q4", "cas": "4区", "cas_top": ""}

    monkeypatch.setattr(ai_api, "_onescholar_lookup", fake_lookup)

    # min_zone=1 → only Nature survives
    r = client.post(
        "/api/ai/discover", json={"query": "FUS", "min_zone": 1}
    )
    assert r.status_code == 200
    data = r.json()
    titles = [x["title"] for x in data["results"]]
    assert titles == ["FUS paper in Nature"], titles
    assert data["results"][0]["if"] == 48.5
    assert data["results"][0]["zone"] == 1

    # min_zone=0 → no filtering
    r2 = client.post(
        "/api/ai/discover", json={"query": "FUS", "min_zone": 0}
    )
    data2 = r2.json()
    assert len(data2["results"]) == 2
    assert data2["zone_filter"] is False
