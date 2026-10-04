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
    async with aiosqlite.connect(_DB_PATH, timeout=30.0) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA foreign_keys=ON;")
        await db.execute(_CREATE_USERS)
        await db.execute(_CREATE_RESUMES)
        await db.execute(_CREATE_JOB_SEARCHES)
        await db.execute(_CREATE_JOB_RECOMMENDATIONS)

        # Synthetic fixtures only. These rows are intentionally ownerless and are not
        # returned by authenticated API queries; they keep legacy/demo assumptions stable.
        default_profiles = [
            {
                "id": 1,
                "name": "Sample Candidate A",
                "email": "candidate-a@example.invalid",
                "phone": "+82-10-0000-0001",
                "skills": ["Spanish", "English", "Korean", "Content Marketing", "Design", "Interpretation"],
                "experience": [
                    {"company": "Example Media Studio", "title": "Content Specialist", "duration": "2022 - Present", "description": "Synthetic fixture for multilingual content and marketing experience.", "years": 2.0}
                ],
                "education": [
                    {"degree": "Bachelor", "school": "Example University", "field": "Digital Media", "year": "2022"}
                ],
                "total_years_experience": 2.0,
                "level": "mid",
                "domains": ["Digital Marketing", "Interpretation", "Content Creation"],
                "languages": ["Spanish", "English", "Korean"],
                "summary": "Synthetic multilingual content and interpretation candidate used only as a development fixture."
            },
            {
                "id": 2,
                "name": "Sample Candidate B",
                "email": "candidate-b@example.invalid",
                "phone": "+82-10-0000-0002",
                "skills": ["Korean", "AI Evaluation", "Data Labeling", "QA", "Python"],
                "experience": [
                    {"company": "Example AI Lab", "title": "Data Quality Analyst", "duration": "2023 - Present", "description": "Synthetic fixture for AI response evaluation and data quality work.", "years": 2.0}
                ],
                "education": [
                    {"degree": "Bachelor", "school": "Example Institute", "field": "Computer Science", "year": "2021"}
                ],
                "total_years_experience": 2.0,
                "level": "mid",
                "domains": ["AI/Data", "Audio Processing", "Education"],
                "languages": ["Korean", "English"],
                "summary": "Synthetic AI data quality candidate used only as a development fixture."
            }
        ]

        for p in default_profiles:
            profile_copy = {**p, "resume_id": p["id"]}
            await db.execute(
                """
                INSERT INTO resumes (id, content_text, parsed_skills, parsed_experience, parsed_education, level, ai_profile)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
                """,
                (
                    p["id"],
                    p["summary"],
                    to_json(p["skills"]),
                    to_json(p["experience"]),
                    to_json(p["education"]),
                    p["level"],
                    to_json(profile_copy),
                ),
            )

        await db.commit()


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Async context manager – yields an open DB connection."""
    async with aiosqlite.connect(_DB_PATH, timeout=30.0) as db:
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
