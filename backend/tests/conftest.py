"""Test configuration: isolate the data directory from the real one."""
from __future__ import annotations

import os
from pathlib import Path

os.environ["AIROS_DATA_DIR"] = str(
    Path(__file__).resolve().parents[1] / ".test-data"
)

# Register all models and create tables before any test imports the app.
from app import models  # noqa: E402,F401
from app.core.db import init_db  # noqa: E402

init_db()
