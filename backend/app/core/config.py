"""Application configuration.

All settings are local-first. The data directory defaults to the macOS
Application Support folder but can be overridden with the ``AIROS_DATA_DIR``
environment variable (useful for development and sandboxed environments).
"""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def default_data_dir() -> Path:
    return Path.home() / "Library" / "Application Support" / "AI-Research-OS"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AIROS_", env_file=".env", extra="ignore"
    )

    app_name: str = "AI Research OS"
    version: str = "0.1.0"
    host: str = "127.0.0.1"
    port: int = 8000

    # Data directory (SQLite database, settings.json, fallback secrets)
    data_dir: Path = default_data_dir()

    # Default Obsidian vault used by the app
    vault_path: Path = Path.home() / "ai-research-vault"

    # DeepSeek / OpenAI-compatible endpoint defaults
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    @property
    def db_path(self) -> Path:
        return self.data_dir / "airos.db"

    @property
    def settings_file(self) -> Path:
        return self.data_dir / "settings.json"


settings = Settings()
