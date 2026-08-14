"""AI endpoint tests with a mocked DeepSeek client (no network / no key)."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_FAKE_TEXT = "模拟的 AI 回答：FUS 蛋白通过多价相互作用驱动液-液相分离。"


def _fake_stream(user_message: str, system: str = "", **kwargs):
    yield _FAKE_TEXT[:10]
    yield _FAKE_TEXT[10:]


def _fake_complete(user_message: str, system: str = "", **kwargs):
    if "JSON" in system or "JSON" in user_message or "{" in user_message:
        return '{"kind": "idea", "project": null, "tags": ["FUS"], "next_action": "整理笔记", "reason": "属于研究想法"}'
    return _FAKE_TEXT


def test_memory_crud():
    for e in client.get("/api/memory").json():
        client.delete(f"/api/memory/{e['id']}")

    r = client.post("/api/memory", json={"kind": "terminology", "content": "LLPS = 液-液相分离"})
    assert r.status_code == 201
    mid = r.json()["id"]

    r = client.patch(f"/api/memory/{mid}", json={"content": "LLPS = 液-液相分离 (liquid-liquid phase separation)"})
    assert r.json()["content"].startswith("LLPS = 液-液相分离 (liquid")

    assert client.delete(f"/api/memory/{mid}").status_code == 200
    assert client.get("/api/memory").json() == []


def test_ai_endpoints_with_mock(monkeypatch):
    from app.ai import client as ai_client
    from app.ai import memory

    monkeypatch.setattr(ai_client, "stream", _fake_stream)
    monkeypatch.setattr(ai_client, "complete", _fake_complete)
    monkeypatch.setattr(ai_client, "get_secret", lambda: "sk-fake")

    # cleanup
    for p in client.get("/api/projects").json():
        client.delete(f"/api/projects/{p['id']}")
    for i in client.get("/api/inbox").json():
        client.delete(f"/api/inbox/{i['id']}")
    for e in client.get("/api/experiments").json():
        client.delete(f"/api/experiments/{e['id']}")
    for e in client.get("/api/memory").json():
        client.delete(f"/api/memory/{e['id']}")

    # memory injected into context
    client.post("/api/memory", json={"kind": "fact", "content": "FUS 属于 FET 家族蛋白"})

    # project + context chat
    p = client.post("/api/projects", json={"title": "AI 测试项目"}).json()
    r = client.post(
        "/api/ai/chat",
        json={"message": "这个项目在做什么？", "object_type": "project", "object_id": p["id"]},
    )
    assert r.status_code == 200
    body = "".join(r.text.split("data: ")[1:])
    assert "模拟的 AI 回答" in body.replace("\n", "")
    assert "event: done" in r.text

    # missing key → friendly 400
    monkeypatch.setattr(ai_client, "get_secret", lambda: None)
    r = client.post("/api/ai/chat", json={"message": "hi"})
    assert r.status_code == 400
    assert "API Key" in r.json()["detail"]

    # writing assist
    r = client.post(
        "/api/ai/writing-assist",
        json={"content": "## 引言\nFUS 突变与 ALS 相关。", "instruction": "润色"},
    )
    assert r.status_code == 200
    assert "模拟的 AI 回答" in r.json()["suggestion"]

    # learning assist
    c = client.post("/api/learning/concepts", json={"title": "FRAP"}).json()
    r = client.post("/api/ai/learning-assist", json={"concept_id": c["id"], "mode": "explain"})
    assert r.status_code == 200
    assert "模拟的 AI 回答" in r.json()["answer"]
    client.delete(f"/api/learning/concepts/{c['id']}")

    # inbox classify
    item = client.post("/api/inbox", json={"kind": "other", "text": "试试 FUS 磷酸化突变体"}).json()
    r = client.post("/api/ai/inbox-classify", json={"item_id": item["id"]})
    assert r.status_code == 200
    assert r.json()["suggestion"]["kind"] == "idea"

    # experiment next-step
    e = client.post(
        "/api/experiments", json={"project_id": p["id"], "title": "FRAP 实验"}
    ).json()
    r = client.post("/api/ai/experiment-next", json={"experiment_id": e["id"]})
    assert r.status_code == 200
    assert "模拟的 AI 回答" in r.json()["suggestions"]

    # cleanup
    client.delete(f"/api/experiments/{e['id']}")
    client.delete(f"/api/inbox/{item['id']}")
    client.delete(f"/api/projects/{p['id']}")
    for e in client.get("/api/memory").json():
        client.delete(f"/api/memory/{e['id']}")
