"""
Resume Router – /api/resume
Handles file uploads, text submissions, AI analysis, and DB persistence.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import aiosqlite
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, EmailStr, field_validator

from database import from_json, get_db, to_json
from services.ai_analyzer import analyze_resume
from services.resume_parser import parse_resume

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""
    years: float = 0.0


class EducationItem(BaseModel):
    degree: str = ""
    school: str = ""
    year: str = ""
    field: str = ""


class ResumeProfile(BaseModel):
    resume_id: int
    name: str
    email: str
    phone: str
    skills: list[str]
    experience: list[ExperienceItem]
    education: list[EducationItem]
    total_years_experience: float
    level: str
    domains: list[str]
    languages: list[str]
    summary: str
    filename: Optional[str] = None


class TextResumeRequest(BaseModel):
    text: str
    filename: Optional[str] = "resume.txt"

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Resume text cannot be empty")
        if len(v.strip()) < 50:
            raise ValueError("Resume text is too short to analyse")
        return v.strip()


class ResumeResponse(BaseModel):
    success: bool
    message: str
    profile: ResumeProfile


# ---------------------------------------------------------------------------
# Helper: save resume to DB
# ---------------------------------------------------------------------------
async def _save_resume_to_db(
    db: aiosqlite.Connection,
    filename: str,
    content_text: str,
    profile: dict[str, Any],
) -> int:
    """Insert a resume record and return its new row ID."""
    cursor = await db.execute(
        """
        INSERT INTO resumes
            (filename, content_text, parsed_skills, parsed_experience,
             parsed_education, level, ai_profile)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            filename,
            content_text,
            to_json(profile.get("skills", [])),
            to_json(profile.get("experience", [])),
            to_json(profile.get("education", [])),
            profile.get("level", "mid"),
            to_json(profile),
        ),
    )
    await db.commit()
    return cursor.lastrowid  # type: ignore[return-value]


def _row_to_profile(row: aiosqlite.Row) -> ResumeProfile:
    """Convert a DB row dict to a ResumeProfile."""
    ai_profile: dict[str, Any] = from_json(row["ai_profile"]) or {}  # type: ignore[arg-type]
    return ResumeProfile(
        resume_id=row["id"],
        name=ai_profile.get("name", ""),
        email=ai_profile.get("email", ""),
        phone=ai_profile.get("phone", ""),
        skills=from_json(row["parsed_skills"]),  # type: ignore[arg-type]
        experience=[ExperienceItem(**e) for e in (from_json(row["parsed_experience"]) or [])],
        education=[EducationItem(**e) for e in (from_json(row["parsed_education"]) or [])],
        total_years_experience=ai_profile.get("total_years_experience", 0.0),
        level=row["level"],
        domains=ai_profile.get("domains", []),
        languages=ai_profile.get("languages", []),
        summary=ai_profile.get("summary", ""),
        filename=row["filename"],
    )


# ---------------------------------------------------------------------------
# POST /api/resume/upload
# ---------------------------------------------------------------------------
@router.post(
    "/upload",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a resume file (PDF / DOCX / TXT)",
)
async def upload_resume(
    file: UploadFile = File(..., description="Resume file – PDF, DOCX, or TXT"),
) -> ResumeResponse:
    """
    Upload a resume file. The server will:
    1. Parse the text from the document.
    2. Send the text to Gemini AI for structured extraction.
    3. Persist the result in the database.
    4. Return the parsed profile.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    # Size guard (read lazily)
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
        )

    # Parse raw text
    try:
        content_text = parse_resume(file_bytes, file.filename)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Failed to parse resume file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to extract text from the document. Please ensure it is not corrupted.",
        ) from exc

    if not content_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No text could be extracted from the document. It may be a scanned image.",
        )

    # AI analysis
    try:
        profile = await analyze_resume(content_text)
    except Exception as exc:
        logger.exception("AI analysis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI analysis service is temporarily unavailable. Please try again later.",
        ) from exc

    # Persist
    async for db in get_db():
        resume_id = await _save_resume_to_db(db, file.filename, content_text, profile)

    return ResumeResponse(
        success=True,
        message="Resume uploaded and analysed successfully",
        profile=ResumeProfile(
            resume_id=resume_id,
            name=profile.get("name", ""),
            email=profile.get("email", ""),
            phone=profile.get("phone", ""),
            skills=profile.get("skills", []),
            experience=[ExperienceItem(**e) for e in profile.get("experience", [])],
            education=[EducationItem(**e) for e in profile.get("education", [])],
            total_years_experience=profile.get("total_years_experience", 0.0),
            level=profile.get("level", "mid"),
            domains=profile.get("domains", []),
            languages=profile.get("languages", []),
            summary=profile.get("summary", ""),
            filename=file.filename,
        ),
    )


# ---------------------------------------------------------------------------
# POST /api/resume/text
# ---------------------------------------------------------------------------
@router.post(
    "/text",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit resume as plain text",
)
async def submit_text_resume(body: TextResumeRequest) -> ResumeResponse:
    """
    Submit resume content as plain text. Useful when the frontend already
    has the text (e.g. from a text area).
    """
    try:
        profile = await analyze_resume(body.text)
    except Exception as exc:
        logger.exception("AI analysis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI analysis service is temporarily unavailable.",
        ) from exc

    filename = body.filename or "resume.txt"

    async for db in get_db():
        resume_id = await _save_resume_to_db(db, filename, body.text, profile)

    return ResumeResponse(
        success=True,
        message="Resume analysed successfully",
        profile=ResumeProfile(
            resume_id=resume_id,
            name=profile.get("name", ""),
            email=profile.get("email", ""),
            phone=profile.get("phone", ""),
            skills=profile.get("skills", []),
            experience=[ExperienceItem(**e) for e in profile.get("experience", [])],
            education=[EducationItem(**e) for e in profile.get("education", [])],
            total_years_experience=profile.get("total_years_experience", 0.0),
            level=profile.get("level", "mid"),
            domains=profile.get("domains", []),
            languages=profile.get("languages", []),
            summary=profile.get("summary", ""),
            filename=filename,
        ),
    )


# ---------------------------------------------------------------------------
# GET /api/resume/latest
# ---------------------------------------------------------------------------
@router.get(
    "/latest",
    response_model=ResumeResponse,
    summary="Retrieve the most recently uploaded resume profile",
)
async def get_latest_resume() -> ResumeResponse:
    """Fetch the latest analysed resume profile from the database."""
    async for db in get_db():
        row = await db.execute_fetchall(
            "SELECT * FROM resumes ORDER BY id DESC LIMIT 1"
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume profile found",
        )

    profile_row = row[0]
    return ResumeResponse(
        success=True,
        message="Latest resume profile retrieved",
        profile=_row_to_profile(profile_row),
    )


# ---------------------------------------------------------------------------
# GET /api/resume/{resume_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{resume_id}",
    response_model=ResumeResponse,
    summary="Retrieve a stored resume profile by ID",
)
async def get_resume(resume_id: int) -> ResumeResponse:
    """Fetch a previously analysed resume profile from the database."""
    async for db in get_db():
        row = await db.execute_fetchall(
            "SELECT * FROM resumes WHERE id = ? LIMIT 1",
            (resume_id,),
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with id={resume_id} not found",
        )

    profile_row = row[0]
    return ResumeResponse(
        success=True,
        message="Resume profile retrieved",
        profile=_row_to_profile(profile_row),
    )
