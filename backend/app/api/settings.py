"""User settings API.

Non-secret settings are persisted as JSON in the data directory (see
``core.user_settings``). The DeepSeek API key is stored in the macOS
Keychain (via keyring) with a fallback to a local, permission-restricted
file when the Keychain is unavailable (e.g. headless/sandboxed
environments). Secrets are never returned by the API and never stored in
the repository.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.config import settings as app_settings
from ..core.user_settings import (
    DEFAULTS,
    PUBLIC_KEYS,
    load_user_settings,
    save_user_settings,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])

KEYRING_SERVICE = "ai-research-os"
KEYRING_USERNAME = "deepseek-api-key"
ONESCHOLAR_USERNAME = "onescholar-api-key"


def _secret_file(username: str = KEYRING_USERNAME) -> Path:
    return app_settings.data_dir / f"secret-{username}.json"


def _keychain_store(key: str, username: str = KEYRING_USERNAME) -> None:
    import keyring

    keyring.set_password(KEYRING_SERVICE, username, key)


def _keychain_get(username: str = KEYRING_USERNAME) -> str | None:
    import keyring

    return keyring.get_password(KEYRING_SERVICE, username)


def _keychain_delete(username: str = KEYRING_USERNAME) -> None:
    import keyring

    keyring.delete_password(KEYRING_SERVICE, username)


def _file_store(key: str, username: str = KEYRING_USERNAME) -> None:
    f = _secret_file(username)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps({"api_key": key}), "utf-8")
    f.chmod(0o600)


def _file_get(username: str = KEYRING_USERNAME) -> str | None:
    f = _secret_file(username)
    if f.exists():
        try:
            return json.loads(f.read_text("utf-8")).get("api_key")
        except Exception:
            return None
    return None


def store_secret(key: str, username: str = KEYRING_USERNAME) -> None:
    try:
        _keychain_store(key, username)
    except Exception:
        _file_store(key, username)


def get_secret(username: str = KEYRING_USERNAME) -> str | None:
    try:
        val = _keychain_get(username)
        if val:
            return val
    except Exception:
        pass
    return _file_get(username)


def delete_secret(username: str = KEYRING_USERNAME) -> None:
    try:
        _keychain_delete(username)
    except Exception:
        pass
    f = _secret_file(username)
    if f.exists():
        f.unlink()


class SettingsUpdate(BaseModel):
    vault_path: str | None = None
    extra_vaults: list[str] | None = None
    zotero_path: str | None = None
    language: str | None = None
    theme: str | None = None
    ui_theme: str | None = None
    accent: str | None = None
    brand_subtitle: str | None = None
    brand_subtitle_font: str | None = None
    brand_subtitle_color: str | None = None
    deepseek_model: str | None = None
    deepseek_base_url: str | None = None
    onescholar_base_url: str | None = None
    ai_gpt_url: str | None = None
    ai_claude_science_url: str | None = None


class DeepSeekKeyIn(BaseModel):
    api_key: str


@router.get("")
def get_settings() -> dict:
    data = load_user_settings()
    return {k: data.get(k) for k in PUBLIC_KEYS}


@router.put("")
def update_settings(update: SettingsUpdate) -> dict:
    data = load_user_settings()
    for k in PUBLIC_KEYS:
        v = getattr(update, k)
        if v is not None:
            data[k] = v
    save_user_settings(data)
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

    data = load_user_settings()
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


# ------------------------------------------------------------ One Scholar

class OneScholarKeyIn(BaseModel):
    api_key: str


@router.put("/onescholar-key")
def set_onescholar_key(body: OneScholarKeyIn) -> dict:
    key = body.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key must not be empty")
    store_secret(key, username=ONESCHOLAR_USERNAME)
    return {"ok": True}


@router.delete("/onescholar-key")
def delete_onescholar_key() -> dict:
    delete_secret(username=ONESCHOLAR_USERNAME)
    return {"ok": True}


@router.get("/onescholar-key/status")
def onescholar_key_status() -> dict:
    return {"configured": bool(get_secret(username=ONESCHOLAR_USERNAME))}
