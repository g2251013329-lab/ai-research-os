"""Test configuration: isolate the data directory from the real one."""
from __future__ import annotations

import os
from pathlib import Path

os.environ["AIROS_DATA_DIR"] = str(
    Path(__file__).resolve().parents[1] / ".test-data"
)
