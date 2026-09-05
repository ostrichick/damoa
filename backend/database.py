"""
Damoa – SQLite database initialisation and connection helper (aiosqlite).
"""

from __future__ import annotations

import json
import os
from typing import AsyncGenerator

import aiosqlite
from dotenv import load_dotenv

load_dotenv()

# Resolve the SQLite file path from DATABASE_URL env var.
# We support the sqlite:///./filename.db notation as well as plain paths.
_DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./damoa.db")

if _DATABASE_URL.startswith("sqlite:///"):
    _DB_PATH: str = _DATABASE_URL[len("sqlite:///"):]
else:
    _DB_PATH = _DATABASE_URL

# Make path absolute relative to this file's directory
if not os.path.isabs(_DB_PATH):
    _DB_PATH = os.path.join(os.path.dirname(__file__), _DB_PATH.lstrip("./"))


# ---------------------------------------------------------------------------
# DDL
# ---------------------------------------------------------------------------
_CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""

_CREATE_RESUMES = """
CREATE TABLE IF NOT EXISTS resumes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER,
    filename          TEXT,
    content_text      TEXT    NOT NULL,
    parsed_skills     TEXT    NOT NULL DEFAULT '[]',
    parsed_experience TEXT    NOT NULL DEFAULT '[]',
    parsed_education  TEXT    NOT NULL DEFAULT '[]',
    level             TEXT    NOT NULL DEFAULT 'mid',
    ai_profile        TEXT    NOT NULL DEFAULT '{}',
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
"""

_CREATE_JOB_SEARCHES = """
CREATE TABLE IF NOT EXISTS job_searches (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id    INTEGER NOT NULL,
    search_query TEXT    NOT NULL,
    location     TEXT    NOT NULL DEFAULT '',
    status       TEXT    NOT NULL DEFAULT 'pending',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);
"""

_CREATE_JOB_RECOMMENDATIONS = """
CREATE TABLE IF NOT EXISTS job_recommendations (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id      INTEGER NOT NULL,
    job_title      TEXT    NOT NULL,
    company        TEXT    NOT NULL DEFAULT '',
    location       TEXT    NOT NULL DEFAULT '',
    job_url        TEXT    NOT NULL DEFAULT '',
    description    TEXT    NOT NULL DEFAULT '',
    match_score    REAL    NOT NULL DEFAULT 0.0,
    skills_matched TEXT    NOT NULL DEFAULT '[]',
    skills_missing TEXT    NOT NULL DEFAULT '[]',
    platform       TEXT    NOT NULL DEFAULT 'linkedin',
    posted_date    TEXT    NOT NULL DEFAULT '',
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (search_id) REFERENCES job_searches(id) ON DELETE CASCADE
);
"""


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """Create all tables if they don't exist yet."""
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA foreign_keys=ON;")
        await db.execute(_CREATE_USERS)
        await db.execute(_CREATE_RESUMES)
        await db.execute(_CREATE_JOB_SEARCHES)
        await db.execute(_CREATE_JOB_RECOMMENDATIONS)
        await db.commit()


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Async context manager – yields an open DB connection."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys=ON;")
        yield db


# ---------------------------------------------------------------------------
# Convenience serialise helpers
# ---------------------------------------------------------------------------
def to_json(value: object) -> str:
    """Serialise a Python object to a JSON string for storage."""
    return json.dumps(value, ensure_ascii=False)


def from_json(value: str | None) -> object:
    """Deserialise a JSON string from storage; returns empty list on error."""
    if not value:
        return []
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []
