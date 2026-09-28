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

        # Pre-seed default couple profiles so id=1 and id=2 always exist across restarts
        default_profiles = [
            {
                "id": 1,
                "name": "Nicole Mostacero Salinas",
                "email": "nicole.salinas@example.com",
                "phone": "+82-10-0000-0000",
                "skills": ["Spanish", "English", "Korean", "Canva", "Meta Business Suite", "Social Media Marketing", "Content Creation", "Medical Interpretation", "Video Production", "YouTube SEO"],
                "experience": [
                    {"company": "Freelance", "title": "Social Media Marketer & Content Creator", "duration": "2021 - Present", "description": "Canva 기반 그래픽 디자인, SNS 비주얼 기획, 유튜브 채널 운영 및 콘텐츠 최적화", "years": 3.0},
                    {"company": "Medical Translation Service", "title": "Medical Interpreter (Spanish/English)", "duration": "2022 - 2023", "description": "환자 및 의료진 간 스페인어-영어 실시간 원격 의료 통역", "years": 1.5}
                ],
                "education": [
                    {"degree": "Bachelor of Digital Media & Audiovisual Communication", "school": "Universidad Peruana de Ciencias Aplicadas (UPC)", "field": "디지털 미디어 & 시각영상 커뮤니케이션", "year": "2021"}
                ],
                "total_years_experience": 3.0,
                "level": "mid",
                "domains": ["Digital Marketing", "Interpretation/Translation", "Content Creation", "Foreign Language Education"],
                "languages": ["Spanish", "English", "Korean"],
                "summary": "페루 출신 스페인어 원어민이자 고급 영어 구사자로, 디지털 미디어 시각영상 커뮤니케이션을 전공하고 Canva 기반 그래픽 디자인, SNS 마케팅, 유튜브 운영 및 의료 통역 경험을 보유하고 있습니다."
            },
            {
                "id": 2,
                "name": "최문성 (Moonseong Choi)",
                "email": "moonseong.choi@example.com",
                "phone": "+82-10-1111-2222",
                "skills": ["Korean", "AI Evaluation", "LLM Training", "Prompt Engineering", "Data Labeling", "Audio QA", "Python", "Computer Science"],
                "experience": [
                    {"company": "Outlier AI / Remotasks", "title": "AI Audio QA & LLM Data Annotator", "duration": "2023 - 2024", "description": "대화형 AI 음성 품질 평가 및 한국어 RLHF 벤치마킹", "years": 2.0}
                ],
                "education": [
                    {"degree": "Bachelor", "school": "전북대학교", "field": "컴퓨터과학 / 한국어교육", "year": "2020"}
                ],
                "total_years_experience": 2.5,
                "level": "mid",
                "domains": ["AI/Data", "Audio Processing", "Education"],
                "languages": ["Korean", "English"],
                "summary": "컴퓨터과학 및 한국어교육 전공자로, 글로벌 AI 플랫폼(Outlier 등)에서 음성 대화형 AI 품질 평가 및 LLM 데이터 어노테이션 경험을 보유한 AI 데이터 평가 전문가입니다."
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
