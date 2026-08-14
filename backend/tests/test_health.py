from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["app"] == "AI Research OS"


def test_settings_roundtrip():
    r = client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert data["language"] in ("zh", "en")
    assert data["theme"] in ("light", "dark")

    r = client.put("/api/settings", json={"language": "en", "theme": "light"})
    assert r.status_code == 200
    assert r.json()["language"] == "en"

    # restore defaults
    client.put("/api/settings", json={"language": "zh", "theme": "dark"})


def test_deepseek_key_status_without_key():
    r = client.get("/api/settings/deepseek-key/status")
    assert r.status_code == 200
    assert "configured" in r.json()
