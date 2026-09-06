"""
Gemini AI Analyzer Service
Uses Google Gemini 2.0 Flash to extract structured profile data from resume text.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
def _get_api_key() -> str:
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("Value")
        or os.getenv("GEMINI_KEY")
        or ""
    ).strip().strip('"').strip("'")


def _get_client() -> genai.Client | None:
    api_key = _get_api_key()
    if not api_key:
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as exc:
        logger.error("Failed to initialize genai.Client: %s", exc)
        return None

# Fallback chain: try ultra-fast lightweight active models first
_MODEL_CANDIDATES = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """
You are an expert HR data extraction AI. Your task is to analyse resume text
and extract structured information in valid JSON format.

IMPORTANT RULES:
1. Return ONLY a valid JSON object — no markdown fences, no extra text.
2. If a field cannot be determined, use the default value shown below.
3. Never hallucinate information not present in the resume.
4. "level" must be exactly one of: "junior", "mid", "senior", "lead".
5. For "total_years_experience", sum up all work experience years (float).
6. "skills" should include ALL technical and soft skills mentioned.
7. "domains" should list industries/domains the candidate has worked in.
8. "languages" should list spoken/written languages (not programming languages).

Return this exact schema:
{
  "name": "string (full name or empty string)",
  "email": "string (email address or empty string)",
  "phone": "string (phone number or empty string)",
  "skills": ["array of skill strings"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "e.g. Jan 2020 - Mar 2022",
      "description": "brief description of responsibilities",
      "years": 2.2
    }
  ],
  "education": [
    {
      "degree": "e.g. Bachelor of Science",
      "school": "university / institution name",
      "year": "graduation year or date range",
      "field": "field of study"
    }
  ],
  "total_years_experience": 5.0,
  "level": "mid",
  "domains": ["fintech", "e-commerce"],
  "languages": ["English", "Korean"],
  "summary": "2-3 sentence professional summary based on the resume"
}
"""


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------
async def analyze_resume(resume_text: str) -> dict[str, Any]:
    """
    Send resume text to Gemini and return a structured profile dict.
    Tries each model in _MODEL_CANDIDATES until one succeeds.
    Falls back to a skeleton profile if all fail.
    """
    client = _get_client()
    if not client:
        logger.warning("GEMINI_API_KEY not set or empty - returning skeleton profile.")
        return _skeleton_profile("GEMINI_API_KEY is not configured on the server. Please verify GEMINI_API_KEY in Render Environment Variables.")

    prompt = f"Here is the resume text to analyse:\n\n{resume_text}"
    last_error: Exception | None = None

    for model_name in _MODEL_CANDIDATES:
        try:
            logger.info("Trying Gemini model: %s", model_name)
            def _call_gemini():
                return client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=_SYSTEM_PROMPT,
                        temperature=0.1,
                        max_output_tokens=4096,
                        response_mime_type="application/json",
                    ),
                )

            # Strict 8.0s timeout to prevent server hanging
            response = await asyncio.wait_for(asyncio.to_thread(_call_gemini), timeout=8.0)
            raw_text: str = response.text.strip()
            raw_text = _strip_markdown_fences(raw_text)
            profile: dict[str, Any] = json.loads(raw_text)
            profile = _normalise_profile(profile)
            logger.info("Resume analysis OK with model=%s: %d skills found", model_name, len(profile.get("skills", [])))
            return profile

        except json.JSONDecodeError as exc:
            logger.error("Model %s returned invalid JSON: %s", model_name, exc)
            last_error = exc
            break  # JSON error means model responded but output was bad — don't retry others
        except asyncio.TimeoutError:
            logger.warning("Model %s timed out after 8s, trying next...", model_name)
            last_error = TimeoutError(f"Model {model_name} timed out")
            continue
        except Exception as exc:
            logger.warning("Model %s failed (%s), trying next...", model_name, exc)
            last_error = exc
            continue

    logger.error("All Gemini models failed. Last error: %s", last_error)
    return _skeleton_profile(f"Google Gemini model request failed ({last_error}). Please check API quota or rate limits.")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers if present."""
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _normalise_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """Ensure all expected keys are present with correct types."""
    defaults: dict[str, Any] = {
        "name": "",
        "email": "",
        "phone": "",
        "skills": [],
        "experience": [],
        "education": [],
        "total_years_experience": 0.0,
        "level": "mid",
        "domains": [],
        "languages": [],
        "summary": "",
    }

    for key, default in defaults.items():
        if key not in profile or profile[key] is None:
            profile[key] = default

    # Coerce level to valid enum value
    valid_levels = {"junior", "mid", "senior", "lead"}
    if profile["level"] not in valid_levels:
        years = float(profile.get("total_years_experience") or 0)
        profile["level"] = _infer_level(years)

    # Coerce numeric field
    try:
        profile["total_years_experience"] = float(
            profile.get("total_years_experience") or 0
        )
    except (TypeError, ValueError):
        profile["total_years_experience"] = 0.0

    # Ensure list fields are actually lists
    for list_field in ("skills", "experience", "education", "domains", "languages"):
        if not isinstance(profile[list_field], list):
            profile[list_field] = []

    # Normalise experience entries
    normalised_exp = []
    for exp in profile["experience"]:
        if isinstance(exp, dict):
            normalised_exp.append(
                {
                    "title": exp.get("title", ""),
                    "company": exp.get("company", ""),
                    "duration": exp.get("duration", ""),
                    "description": exp.get("description", ""),
                    "years": float(exp.get("years") or 0),
                }
            )
    profile["experience"] = normalised_exp

    # Normalise education entries
    normalised_edu = []
    for edu in profile["education"]:
        if isinstance(edu, dict):
            normalised_edu.append(
                {
                    "degree": edu.get("degree", ""),
                    "school": edu.get("school", ""),
                    "year": edu.get("year", ""),
                    "field": edu.get("field", ""),
                }
            )
    profile["education"] = normalised_edu

    return profile


def _infer_level(years: float) -> str:
    if years < 2:
        return "junior"
    if years < 5:
        return "mid"
    if years < 10:
        return "senior"
    return "lead"


def _skeleton_profile(error_reason: str = "") -> dict[str, Any]:
    """Return a blank profile when AI analysis is unavailable with clear error reason."""
    summary_msg = (
        f"[Step 2: AI Analysis Error / 2단계: AI 분석 오류] {error_reason}"
        if error_reason
        else "[Step 2: AI Analysis Error / 2단계: AI 분석 오류] Gemini API 키가 설정되지 않았습니다. Render 환경 변수(GEMINI_API_KEY)를 확인해주세요."
    )
    return {
        "name": "",
        "email": "",
        "phone": "",
        "skills": [],
        "experience": [],
        "education": [],
        "total_years_experience": 0.0,
        "level": "mid",
        "domains": [],
        "languages": [],
        "summary": summary_msg,
    }
