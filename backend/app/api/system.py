"""System actions: launch macOS apps / open files in external tools.

Used by the command palette ("Open Zotero", "Open Obsidian", ...) and by
search results ("open this note in Obsidian").
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/system", tags=["system"])


class OpenFileIn(BaseModel):
    path: str
    app: str | None = None  # e.g. "Obsidian"


class LaunchAppIn(BaseModel):
    app: str  # macOS app name, e.g. "Zotero", "小绿鲸英文文献阅读器"


@router.post("/open-file")
def open_file(body: OpenFileIn) -> dict:
    p = Path(body.path).expanduser()
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {p}")
    try:
        if body.app:
            subprocess.run(
                ["open", "-a", body.app, str(p)], check=True, timeout=10
            )
        else:
            subprocess.run(["open", str(p)], check=True, timeout=10)
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Failed to open: {exc}")


@router.post("/launch-app")
def launch_app(body: LaunchAppIn) -> dict:
    try:
        subprocess.run(["open", "-a", body.app], check=True, timeout=10)
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail=f"Failed to launch {body.app}: {exc}"
        )


# ------------------------------------------------------------ Claude Science
# One-click entry to the local Claude Science sandbox managed by CS Switch:
#   1. start the sandbox daemon (:8990) if it is down
#   2. start the DeepSeek inference proxy (:18991) if it is down
#   3. return the URL to open — the sandbox itself when already logged in,
#      otherwise a fresh single-use login link (same flow as CS Switch).
# Secrets (proxy key) are read from the user's own CS Switch config and only
# injected into the local proxy process environment (loopback only), exactly
# like the CS Switch menu-bar app does — never logged or returned.

CSSWITCH_CONFIG = Path.home() / ".csswitch" / "config.json"
CSSWITCH_SANDBOX_HOME = Path.home() / ".csswitch" / "sandbox" / "home"
CS_DATA_DIR = CSSWITCH_SANDBOX_HOME / ".claude-science"
CS_BIN = "/Applications/Claude Science.app/Contents/Resources/bin/claude-science"
CS_PROXY = "/Applications/CSSwitch.app/Contents/Resources/proxy/csswitch_proxy.py"
CS_PORT = 8990
CS_PROXY_PORT = 18991


def _port_alive(port: int, timeout: float = 2.0) -> bool:
    import socket

    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def _start_sandbox() -> str | None:
    """Start the sandbox daemon if down; returns an error message or None."""
    if _port_alive(CS_PORT):
        return None
    if not CS_BIN or not Path(CS_BIN).exists():
        return "未找到 Claude Science CLI"
    if not CS_DATA_DIR.exists():
        return "未找到 CS Switch 沙箱数据目录"
    env = {
        **os.environ,
        "HOME": str(CSSWITCH_SANDBOX_HOME),
        "ANTHROPIC_BASE_URL": f"http://127.0.0.1:{CS_PROXY_PORT}",
    }
    try:
        subprocess.Popen(
            [
                CS_BIN, "serve",
                "--data-dir", str(CS_DATA_DIR),
                "--port", str(CS_PORT),
                "--no-browser", "--no-auto-update", "--detached",
            ],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        for _ in range(20):  # wait up to ~10s for the port
            if _port_alive(CS_PORT):
                return None
            time.sleep(0.5)
        return "沙箱启动超时"
    except Exception as exc:  # noqa: BLE001
        return f"沙箱启动失败：{exc}"


def _start_proxy() -> bool:
    """Start the DeepSeek inference proxy if down; returns True when alive."""
    if _port_alive(CS_PROXY_PORT):
        return True
    try:
        cfg = json.loads(CSSWITCH_CONFIG.read_text("utf-8"))
        key = (cfg.get("profiles") or [{}])[0].get("api_key", "")
        if not key:
            return False
        env = {**os.environ, "DEEPSEEK_API_KEY": key}
        subprocess.Popen(
            ["python3", CS_PROXY, "--provider", "deepseek", "--port", str(CS_PROXY_PORT)],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        for _ in range(10):
            if _port_alive(CS_PROXY_PORT):
                return True
            time.sleep(0.5)
    except Exception:  # noqa: BLE001
        pass
    return False


def _login_link() -> str | None:
    try:
        out = subprocess.run(
            [CS_BIN, "url", "--data-dir", str(CS_DATA_DIR)],
            env={**os.environ, "HOME": str(CSSWITCH_SANDBOX_HOME)},
            capture_output=True, text=True, timeout=15,
        )
        return (out.stdout or "").strip().splitlines()[0] or None
    except Exception:  # noqa: BLE001
        return None


@router.post("/claude-science-open")
def claude_science_open() -> dict:
    # The daemon restarts invalidate the browser session, so the reliable
    # entry is ALWAYS a fresh single-use auth link (same as `claude-science
    # url`): it shows the sign-in page when needed and passes straight
    # through when the session is still valid. `direct` is for already
    # logged-in users who want to skip the auth page.
    err = _start_sandbox()
    if err:
        return {"ok": False, "error": err}
    proxy_alive = _start_proxy()
    link = _login_link()
    return {
        "ok": True,
        "url": link or "http://localhost:8990",
        "direct": "http://localhost:8990",
        "proxy_alive": proxy_alive,
    }


@router.post("/claude-science-login")
def claude_science_login() -> dict:
    """Force a fresh single-use login link (session expired / re-auth)."""
    _start_sandbox()
    link = _login_link()
    return {"ok": bool(link), "url": link or "http://localhost:8990"}
