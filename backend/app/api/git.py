"""Git sync for the Obsidian vault (PRD §16.1).

Runs git subprocesses inside the configured vault directory. Never commits
secrets: the vault only contains Markdown; the app's own data dir and
secrets live outside the vault.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.user_settings import get_user_setting

router = APIRouter(prefix="/api/git", tags=["git"])


def _vault() -> Path:
    return Path(get_user_setting("vault_path", "") or "").expanduser()


def _run(args: list[str], cwd: Path, timeout: int = 60) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True, timeout=timeout
        )
        return proc.returncode, (proc.stdout or "") + (proc.stderr or "")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="git executable not found")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="git operation timed out")


def _require_repo() -> Path:
    vault = _vault()
    if not vault.exists():
        raise HTTPException(status_code=404, detail="Vault path not found")
    code, out = _run(["git", "rev-parse", "--is-inside-work-tree"], vault)
    if code != 0:
        raise HTTPException(
            status_code=422,
            detail="Vault is not a git repository. Initialize it first "
            "(e.g. `git init` in the vault, or use Obsidian Git plugin).",
        )
    return vault


def _is_clean(vault: Path) -> bool:
    code, out = _run(["git", "status", "--porcelain"], vault)
    return code == 0 and not out.strip()


@router.get("/status")
def git_status() -> dict:
    try:
        vault = _require_repo()
    except HTTPException as exc:
        return {
            "repo": False,
            "detail": exc.detail,
            "vault": str(_vault()),
        }
    code, branch_out = _run(["git", "branch", "--show-current"], vault)
    _, ahead_out = _run(["git", "rev-list", "--count", "@{u}..HEAD"], vault)
    _, behind_out = _run(["git", "rev-list", "--count", "HEAD..@{u}"], vault)
    _, porcelain = _run(["git", "status", "--porcelain"], vault)
    _, last = _run(["git", "log", "-1", "--format=%h %s (%cr)"], vault)
    dirty = [line[:3] + " " + line[3:].strip() for line in porcelain.strip().splitlines() if line.strip()]
    return {
        "repo": True,
        "vault": str(vault),
        "branch": branch_out.strip() or "unknown",
        "ahead": int((ahead_out or "0").strip() or 0),
        "behind": int((behind_out or "0").strip() or 0),
        "dirty_count": len(dirty),
        "dirty": dirty[:20],
        "last_commit": last.strip(),
    }


class CommitIn(BaseModel):
    message: str = ""


@router.post("/commit")
def git_commit(body: CommitIn) -> dict:
    vault = _require_repo()
    if _is_clean(vault):
        return {"ok": True, "committed": False, "message": "nothing to commit"}
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="commit message required")
    code, out = _run(["git", "add", "-A"], vault)
    if code != 0:
        raise HTTPException(status_code=500, detail=out)
    code, out = _run(["git", "commit", "-m", body.message.strip()], vault)
    if code != 0:
        raise HTTPException(status_code=500, detail=out)
    return {"ok": True, "committed": True, "message": out.strip()}


@router.post("/pull")
def git_pull() -> dict:
    vault = _require_repo()
    code, out = _run(["git", "pull"], vault)
    if code != 0:
        raise HTTPException(
            status_code=409,
            detail="Pull failed — possible conflict:\n" + out.strip()[:500],
        )
    return {"ok": True, "message": out.strip()}


@router.post("/push")
def git_push() -> dict:
    vault = _require_repo()
    code, out = _run(["git", "push"], vault)
    if code != 0:
        raise HTTPException(status_code=500, detail=out.strip()[:500])
    return {"ok": True, "message": out.strip()}


@router.post("/sync")
def git_sync() -> dict:
    """Commit changes (if any) → pull → push. Conflict-safe: reports, never overwrites."""
    vault = _require_repo()
    steps: list[str] = []
    if not _is_clean(vault):
        code, out = _run(["git", "add", "-A"], vault)
        if code != 0:
            raise HTTPException(status_code=500, detail=out)
        msg = f"AI Research OS sync {__import__('datetime').date.today().isoformat()}"
        code, out = _run(["git", "commit", "-m", msg], vault)
        if code != 0:
            raise HTTPException(status_code=500, detail=out)
        steps.append("committed")
    code, out = _run(["git", "pull", "--no-rebase"], vault)
    if code != 0:
        raise HTTPException(
            status_code=409,
            detail="Conflict after pull — resolve in Obsidian/terminal, then retry:\n"
            + out.strip()[:400],
        )
    steps.append("pulled")
    if code == 0:
        code, out = _run(["git", "push"], vault)
        if code != 0:
            raise HTTPException(status_code=500, detail=out.strip()[:400])
        steps.append("pushed")
    return {"ok": True, "steps": steps}
