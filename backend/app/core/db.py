"""SQLite database engine (SQLModel) with WAL mode enabled."""
from __future__ import annotations

from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from .config import settings


def create_db_engine(db_path: Path | None = None) -> object:
    path = db_path or settings.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False, "timeout": 15},
    )
    # WAL mode: better read/write concurrency and lower memory pressure.
    with engine.connect() as conn:
        conn.exec_driver_sql("PRAGMA journal_mode=WAL")
        conn.exec_driver_sql("PRAGMA foreign_keys=ON")
        conn.exec_driver_sql("PRAGMA busy_timeout=5000")
    return engine


engine = create_db_engine()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate(engine)


def _migrate(db_engine: object) -> None:
    """Small ALTER TABLE migrations for evolving schemas."""
    with db_engine.connect() as conn:
        cols = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(timelineevent)").fetchall()
        }
        if "project_id" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE timelineevent ADD COLUMN project_id INTEGER"
            )
        paper_cols = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(paper)").fetchall()
        }
        if "local_path" not in paper_cols:
            conn.exec_driver_sql(
                "ALTER TABLE paper ADD COLUMN local_path VARCHAR NOT NULL DEFAULT ''"
            )
        conn.commit()


def get_session():
    with Session(engine, expire_on_commit=False) as session:
        yield session
