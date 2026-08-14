"""User settings API.

Non-secret settings are persisted as JSON in the data directory. The
DeepSeek API key is stored in the macOS Keychain (via keyring) with a
fallback to a local, permission-restricted file when the Keychain is
unavailable (e.g. headless/sandboxed environments). Secrets are never
returned by the API and never stored in the repository.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.config import settings as app_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

KEYRING_SERVICE = "ai-research-os"
KEYRING_USERNAME = "deepseek-api-key"

PUBLIC_KEYS = (
    "vault_path",
    "language",
    "theme",
    "accent",
    "brand_subtitle",
    "deepseek_model",
    "deepseek_base_url",
)

DEFAULTS: dict[str, Any] = {
    "vault_path": str(app_settings.vault_path),
    "language": "zh",
    "theme": "dark",
    "accent": "ocean",
    "brand_subtitle": "LLPS",
    "deepseek_model": app_settings.deepseek_model,
    "deepseek_base_url": app_settings.deepseek_base_url,
}


def _settings_file() -> Path:
    return app_settings.settings_file


def _load() -> dict[str, Any]:
    data = dict(DEFAULTS)
    f = _settings_file()
    if f.exists():
        try:
            data.update(json.loads(f.read_text("utf-8")))
        except Exception:
            pass
    return data


def _save(data: dict[str, Any]) -> None:
    f = _settings_file()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")


def _secret_file() -> Path:
    return app_settings.data_dir / "secrets.json"


def _keychain_store(key: str) -> None:
    import keyring

    keyring.set_password(KEYRING_SERVICE, KEYRING_USERNAME, key)


def _keychain_get() -> str | None:
    import keyring

    return keyring.get_password(KEYRING_SERVICE, KEYRING_USERNAME)


def _keychain_delete() -> None:
    import keyring

    keyring.delete_password(KEYRING_SERVICE, KEYRING_USERNAME)


def _file_store(key: str) -> None:
    f = _secret_file()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps({"deepseek_api_key": key}), "utf-8")
    f.chmod(0o600)


def _file_get() -> str | None:
    f = _secret_file()
    if f.exists():
        try:
            return json.loads(f.read_text("utf-8")).get("deepseek_api_key")
        except Exception:
            return None
    return None


def store_secret(key: str) -> None:
    try:
        _keychain_store(key)
    except Exception:
        _file_store(key)


def get_secret() -> str | None:
    try:
        val = _keychain_get()
        if val:
            return val
    except Exception:
        pass
    return _file_get()


def delete_secret() -> None:
    try:
        _keychain_delete()
    except Exception:
        pass
    f = _secret_file()
    if f.exists():
        f.unlink()


class SettingsUpdate(BaseModel):
    vault_path: str | None = None
    language: str | None = None
    theme: str | None = None
    accent: str | None = None
    brand_subtitle: str | None = None
    deepseek_model: str | None = None
    deepseek_base_url: str | None = None


class DeepSeekKeyIn(BaseModel):
    api_key: str


@router.get("")
def get_settings() -> dict:
    data = _load()
    return {k: data.get(k) for k in PUBLIC_KEYS}


@router.put("")
def update_settings(update: SettingsUpdate) -> dict:
    data = _load()
    for k in PUBLIC_KEYS:
        v = getattr(update, k)
        if v is not None:
            data[k] = v
    _save(data)
    return {k: data.get(k) for k in PUBLIC_KEYS}


@router.put("/deepseek-key")
def set_deepseek_key(body: DeepSeekKeyIn) -> dict:
    key = body.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key must not be empty")
    store_secret(key)
    return {"ok": True}


@router.delete("/deepseek-key")
def delete_deepseek_key() -> dict:
    delete_secret()
    return {"ok": True}


@router.get("/deepseek-key/status")
def deepseek_key_status() -> dict:
    return {"configured": bool(get_secret())}


@router.post("/deepseek-key/test")
def test_deepseek_key() -> dict:
    key = get_secret()
    if not key:
        raise HTTPException(status_code=400, detail="No API key configured")
    from openai import OpenAI

    data = _load()
    client = OpenAI(
        api_key=key,
        base_url=data.get("deepseek_base_url") or app_settings.deepseek_base_url,
    )
    try:
        resp = client.models.list()
        models = [m.id for m in resp.data]
        return {"ok": True, "models": models}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"DeepSeek API error: {exc}")
