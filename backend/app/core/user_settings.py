"""User settings persistence (non-secret values).

Shared by the settings API and feature services (search, integrations).
Secrets (DeepSeek API key) are handled separately (Keychain / local file).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .config import settings as app_settings

PUBLIC_KEYS = (
    "vault_path",
    "extra_vaults",
    "zotero_path",
    "language",
    "theme",
    "ui_theme",
    "accent",
    "brand_subtitle",
    "brand_subtitle_font",
    "brand_subtitle_color",
    "deepseek_model",
    "deepseek_base_url",
    "onescholar_base_url",
    "ai_gpt_url",
    "ai_claude_science_url",
)

DEFAULTS: dict[str, Any] = {
    "vault_path": str(app_settings.vault_path),
    "extra_vaults": [],
    "zotero_path": "~/Zotero",
    "language": "zh",
    "theme": "dark",
    "ui_theme": "laboratory",
    "accent": "ocean",
    "brand_subtitle": "LLPS",
    "brand_subtitle_font": "great-vibes",
    "brand_subtitle_color": "accent",
    "deepseek_model": app_settings.deepseek_model,
    "deepseek_base_url": app_settings.deepseek_base_url,
    "onescholar_base_url": "https://api.sssam.com",
    "ai_gpt_url": "https://chatgpt.com",
    "ai_claude_science_url": "https://claude.com/product/claude-science",
}


def settings_file() -> Path:
    return app_settings.settings_file


def load_user_settings() -> dict[str, Any]:
    data = dict(DEFAULTS)
    f = settings_file()
    if f.exists():
        try:
            data.update(json.loads(f.read_text("utf-8")))
        except Exception:
            pass
    return data


def save_user_settings(data: dict[str, Any]) -> None:
    f = settings_file()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")


def get_user_setting(key: str, default: Any = None) -> Any:
    return load_user_settings().get(key, default)
