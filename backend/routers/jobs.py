"""
Jobs Router – /api/jobs
Handles job searching, matching, and result retrieval.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

import aiosqlite
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from database import from_json, get_db, to_json
from services.crawlers.multi_crawler import crawl_multi_platform_jobs
from services.matcher import match_jobs_to_profile

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory status store for ongoing searches
# (In production use Redis or a proper task queue)
# ---------------------------------------------------------------------------
_search_status: dict[int, str] = {}  # search_id -> "running"|"completed"|"failed"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class JobSearchRequest(BaseModel):
    resume_id: int = Field(..., description="ID of the uploaded resume to base recommendations on")
    keywords: Optional[str] = Field(None, description="Override keyword query (default: skills from resume)")
    custom_prompt: Optional[str] = Field(None, description="Natural language custom working conditions & preferences")
    location: str = Field("", description="Target job location, e.g. 'Seoul, Korea' or 'Remote'")
    num_results: int = Field(20, ge=1, le=50, description="Number of job results to fetch (1-50)")

    @field_validator("num_results")
    @classmethod
    def clamp_results(cls, v: int) -> int:
        return max(1, min(v, 50))


class ScoreBreakdown(BaseModel):
    skill_score: float
    experience_score: float
    domain_score: float
    education_score: float


class JobResult(BaseModel):
    job_id: int
    title: str
    company: str
    location: str
    url: str
    description: str
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    platform: str
    posted_date: str
    contract_type: Optional[str] = "정규직"
    salary_type: Optional[str] = "연봉"
    salary_amount: Optional[str] = "회사내규에 따름"
    trust_badge: Optional[str] = "🟢 검증된 플랫폼"
    trust_rating: Optional[str] = "HIGH"
    payment_methods: Optional[list[str]] = ["통장 입금", "PayPal"]
    payment_cycle: Optional[str] = "월급 / 주급"
    trust_summary: Optional[str] = ""
    match_reason: Optional[str] = ""
    score_breakdown: Optional[ScoreBreakdown] = None


class JobSearchResponse(BaseModel):
    success: bool
    search_id: int
    total_jobs: int
    jobs: list[JobResult]


class SearchResultsResponse(BaseModel):
    success: bool
    search_id: int
    resume_id: int
    search_query: str
    location: str
    status: str
    total_jobs: int
    jobs: list[JobResult]


class SearchStatusResponse(BaseModel):
    search_id: int
    status: str
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _get_profile_from_db(db: aiosqlite.Connection, resume_id: int) -> dict[str, Any]:
    """Load the AI profile JSON for a resume from the DB."""
    rows = await db.execute_fetchall(
        "SELECT ai_profile, level FROM resumes WHERE id = ? LIMIT 1",
        (resume_id,),
    )
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"[Step 3-A: Profile Load / 3-A단계 이력서 조회 오류] 이력서 번호(id={resume_id})를 데이터베이스에서 찾을 수 없습니다. 이력서를 먼저 업로드해주세요.",
        )
    row = rows[0]
    profile: dict[str, Any] = from_json(row["ai_profile"]) or {}  # type: ignore[arg-type]
    profile.setdefault("level", row["level"])
    return profile


async def _build_search_query(
    profile: dict[str, Any],
    keywords: Optional[str],
    custom_prompt: Optional[str] = None,
) -> str:
    """Build a concise, high-hit-rate job search query string."""
    if keywords and keywords.strip():
        return keywords.strip()

    # 1. If user provided a natural language custom prompt, prioritize its essence
    if custom_prompt and custom_prompt.strip():
        cp_lower = custom_prompt.lower()
        if any(w in custom_prompt or w in cp_lower for w in ("스페인어", "spanish")):
            return "스페인어"
        if any(w in custom_prompt or w in cp_lower for w in ("영어 강사", "english teacher", "강사", "teaching", "tutor")):
            return "영어 강사"
        if any(w in custom_prompt or w in cp_lower for w in ("마케팅", "marketing", "소셜미디어", "social media", "콘텐츠")):
            return "콘텐츠 마케팅"
        if any(w in custom_prompt or w in cp_lower for w in ("통역", "번역", "interpreter", "translation")):
            return "통역"
        if "한국어" in custom_prompt or "korean" in cp_lower:
            if any(w in custom_prompt or w in cp_lower for w in ("ai", "데이터", "평가", "llm", "트레이너")):
                return "Korean AI"
            return "Korean"
        if any(w in custom_prompt or w in cp_lower for w in ("ai", "데이터", "평가", "llm", "트레이너")):
            return "AI Data"

    # 2. Check profile skills, domains, and summary
    skills = profile.get("skills", [])
    domains = profile.get("domains", [])
    languages = profile.get("languages", [])
    summary = profile.get("summary", "")
    all_text = f"{' '.join(skills)} {' '.join(domains)} {' '.join(languages)} {summary}".lower()

    # Multilingual & Language roles (e.g. Spanish, English Teacher, Interpreter)
    if "spanish" in all_text or "스페인어" in all_text:
        if any(term in all_text for term in ("interpret", "통역", "translat", "번역")):
            return "스페인어 통역"
        if any(term in all_text for term in ("teach", "instructor", "tutor", "강사")):
            return "스페인어 강사"
        return "스페인어"

    if any(term in all_text for term in ("medical interpreter", "interpreter", "통역", "translator", "번역")):
        return "통역"

    if any(term in all_text for term in ("english teaching", "language instructor", "esl", "영어 강사")):
        return "영어 강사"

    # Marketing, Content Creation, Communications
    if any(term in all_text for term in ("digital marketing", "social media", "content creation", "content creator", "audiovisual")):
        return "콘텐츠 마케팅"

    # AI Data & Annotation
    if any(term in all_text for term in ("annotation", "라벨링", "evaluat", "평가", "korean language", "한국어")):
        return "Korean AI"

    if any(term in all_text for term in ("ai", "llm", "machine learning", "deep learning", "nlp")):
        return "AI Data"

    # 3. For developer profiles, pick top 1-2 short skill names (e.g. Python, React)
    short_skills = [s for s in skills if len(s.split()) <= 2 and len(s) <= 15][:2]
    if short_skills:
        return " ".join(short_skills)

    return "Marketing" if "marketing" in all_text else "AI"


async def _save_search(
    db: aiosqlite.Connection,
    resume_id: int,
    query: str,
    location: str,
) -> int:
    cursor = await db.execute(
        "INSERT INTO job_searches (resume_id, search_query, location, status) VALUES (?, ?, ?, 'running')",
        (resume_id, query, location),
    )
    await db.commit()
    return cursor.lastrowid  # type: ignore[return-value]


async def _update_search_status(
    db: aiosqlite.Connection,
    search_id: int,
    new_status: str,
) -> None:
    await db.execute(
        "UPDATE job_searches SET status = ? WHERE id = ?",
        (new_status, search_id),
    )
    await db.commit()


async def _save_job_recommendations(
    db: aiosqlite.Connection,
    search_id: int,
    matched_jobs: list[dict[str, Any]],
) -> list[int]:
    """Bulk-insert job recommendations and return their IDs."""
    ids: list[int] = []
    for job in matched_jobs:
        breakdown = job.get("score_breakdown", {})
        cursor = await db.execute(
            """
            INSERT INTO job_recommendations
                (search_id, job_title, company, location, job_url,
                 description, match_score, skills_matched, skills_missing,
                 platform, posted_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                search_id,
                job.get("title", ""),
                job.get("company", ""),
                job.get("location", ""),
                job.get("url", ""),
                job.get("description_snippet", job.get("description", ""))[:2000],
                job.get("match_score", 0.0),
                to_json(job.get("matched_skills", [])),
                to_json(job.get("missing_skills", [])),
                job.get("platform", "linkedin"),
                job.get("posted_date", ""),
            ),
        )
        ids.append(cursor.lastrowid)
    await db.commit()
    return ids


def _row_to_job_result(row: aiosqlite.Row) -> JobResult:
    return JobResult(
        job_id=row["id"],
        title=row["job_title"],
        company=row["company"],
        location=row["location"],
        url=row["job_url"],
        description=row["description"],
        match_score=row["match_score"],
        matched_skills=from_json(row["skills_matched"]),  # type: ignore[arg-type]
        missing_skills=from_json(row["skills_missing"]),  # type: ignore[arg-type]
        platform=row["platform"],
        posted_date=row["posted_date"],
    )


# ---------------------------------------------------------------------------
# Background task: crawl + match + persist
# ---------------------------------------------------------------------------
async def _run_job_search(
    search_id: int,
    profile: dict[str, Any],
    query: str,
    location: str,
    num_results: int,
) -> None:
    """
    Background coroutine that:
    1. Crawls LinkedIn for job listings.
    2. Runs the matching engine.
    3. Persists results.
    4. Updates search status.
    """
    _search_status[search_id] = "running"

    try:
        jobs = await crawl_multi_platform_jobs(
            query=query,
            location=location,
            num_jobs=num_results,
        )
        logger.info("Crawled %d jobs for search_id=%d", len(jobs), search_id)

        if not jobs:
            logger.warning("No jobs found for query '%s', location '%s'", query, location)

        matched = match_jobs_to_profile(profile, jobs)

        async for db in get_db():
            job_ids = await _save_job_recommendations(db, search_id, matched)
            await _update_search_status(db, search_id, "completed")

        _search_status[search_id] = "completed"
        logger.info("Search %d completed with %d results", search_id, len(matched))

    except Exception as exc:  # noqa: BLE001
        logger.exception("Job search %d failed: %s", search_id, exc)
        _search_status[search_id] = "failed"
        try:
            async for db in get_db():
                await _update_search_status(db, search_id, "failed")
        except Exception:
            pass


# ---------------------------------------------------------------------------
# POST /api/jobs/search
# ---------------------------------------------------------------------------
@router.post(
    "/search",
    response_model=JobSearchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start a job search for a given resume",
)
async def search_jobs(
    body: JobSearchRequest,
    background_tasks: BackgroundTasks,
) -> JobSearchResponse:
    """
    Trigger a job search based on the candidate's resume profile.

    The endpoint:
    1. Fetches the stored resume profile.
    2. Creates a search record (status = 'running').
    3. Dispatches the crawl + match pipeline as a background task.
    4. Immediately runs a quick synchronous crawl for an instant first response.

    Use GET /api/jobs/status/{search_id} to poll, or
    GET /api/jobs/results/{search_id} to retrieve the final results.
    """
    # Load profile
    async for db in get_db():
        profile = await _get_profile_from_db(db, body.resume_id)

    if body.custom_prompt:
        profile["custom_prompt"] = body.custom_prompt

    query = await _build_search_query(profile, body.keywords, body.custom_prompt)

    # Create DB record
    async for db in get_db():
        search_id = await _save_search(db, body.resume_id, query, body.location)

    _search_status[search_id] = "running"

    # Run crawl: both primary targeted jobs and broader extended discovery (겉절이)
    try:
        crawl_tasks = [
            crawl_multi_platform_jobs(
                query=query,
                location=body.location,
                num_jobs=max(20, body.num_results),
            )
        ]

        # If user specified a narrow location, also crawl nationwide vacancies
        if body.location and body.location.lower() not in ("remote", "korea", "전국", "worldwide"):
            crawl_tasks.append(
                crawl_multi_platform_jobs(
                    query=query,
                    location="전국",
                    num_jobs=15,
                )
            )

        # Also add adjacent keyword searches based on profile skills
        skills = profile.get("skills", [])
        domains = profile.get("domains", [])
        combined_skills = " ".join(skills + domains).lower()

        if "spanish" in combined_skills or "스페인어" in combined_skills:
            crawl_tasks.append(crawl_multi_platform_jobs(query="통역", location="", num_jobs=10))
            crawl_tasks.append(crawl_multi_platform_jobs(query="영어 강사", location="", num_jobs=10))
        elif "marketing" in combined_skills or "마케팅" in combined_skills:
            crawl_tasks.append(crawl_multi_platform_jobs(query="콘텐츠 마케팅", location="", num_jobs=10))
        elif "ai" in combined_skills or "evaluat" in combined_skills:
            crawl_tasks.append(crawl_multi_platform_jobs(query="AI Data", location="", num_jobs=10))
        else:
            crawl_tasks.append(crawl_multi_platform_jobs(query="Remote", location="", num_jobs=10))

        crawl_results = await asyncio.gather(*crawl_tasks, return_exceptions=True)

        seen_keys: set[str] = set()
        all_jobs: list[dict[str, Any]] = []

        for res in crawl_results:
            if isinstance(res, list):
                for j in res:
                    key = f"{j.get('company', '').lower().strip()}:{j.get('title', '').lower().strip()}"
                    if key not in seen_keys and j.get("title"):
                        seen_keys.add(key)
                        all_jobs.append(j)

        matched = match_jobs_to_profile(profile, all_jobs)

        async for db in get_db():
            await _save_job_recommendations(db, search_id, matched)
            await _update_search_status(db, search_id, "completed")

        _search_status[search_id] = "completed"

    except Exception as exc:
        logger.error("Job search failed: %s", exc)
        matched = []
        _search_status[search_id] = "failed"
        async for db in get_db():
            await _update_search_status(db, search_id, "failed")

    job_results = [
        JobResult(
            job_id=idx + 1,
            title=j.get("title", ""),
            company=j.get("company", ""),
            location=j.get("location", ""),
            url=j.get("url", ""),
            description=j.get("description_snippet", j.get("description", "")),
            match_score=j.get("match_score", 0.0),
            matched_skills=j.get("matched_skills", []),
            missing_skills=j.get("missing_skills", []),
            platform=j.get("platform", "linkedin"),
            posted_date=j.get("posted_date", ""),
            contract_type=j.get("contract_type", "정규직"),
            salary_type=j.get("salary_type", "연봉"),
            salary_amount=j.get("salary_amount", "회사내규에 따름"),
            trust_badge=j.get("trust_badge", "🟢 검증된 플랫폼"),
            trust_rating=j.get("trust_rating", "HIGH"),
            payment_methods=j.get("payment_methods", ["통장 입금", "PayPal"]),
            payment_cycle=j.get("payment_cycle", "월급 / 주급"),
            trust_summary=j.get("trust_summary", ""),
            match_reason=j.get("match_reason", ""),
            score_breakdown=(
                ScoreBreakdown(**j["score_breakdown"])
                if j.get("score_breakdown")
                else None
            ),
        )
        for idx, j in enumerate(matched)
    ]

    return JobSearchResponse(
        success=True,
        search_id=search_id,
        total_jobs=len(job_results),
        jobs=job_results,
    )


# ---------------------------------------------------------------------------
# GET /api/jobs/results/{search_id}
# ---------------------------------------------------------------------------
@router.get(
    "/results/{search_id}",
    response_model=SearchResultsResponse,
    summary="Get job search results by search ID",
)
async def get_search_results(search_id: int) -> SearchResultsResponse:
    """
    Retrieve all job recommendations stored for a particular search run.
    """
    # Load search metadata
    async for db in get_db():
        search_rows = await db.execute_fetchall(
            "SELECT * FROM job_searches WHERE id = ? LIMIT 1",
            (search_id,),
        )

    if not search_rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Search with id={search_id} not found.",
        )

    search_row = search_rows[0]

    # Load jobs
    async for db in get_db():
        job_rows = await db.execute_fetchall(
            "SELECT * FROM job_recommendations WHERE search_id = ? ORDER BY match_score DESC",
            (search_id,),
        )

    jobs = [_row_to_job_result(r) for r in job_rows]

    return SearchResultsResponse(
        success=True,
        search_id=search_id,
        resume_id=search_row["resume_id"],
        search_query=search_row["search_query"],
        location=search_row["location"],
        status=search_row["status"],
        total_jobs=len(jobs),
        jobs=jobs,
    )


# ---------------------------------------------------------------------------
# GET /api/jobs/status/{search_id}
# ---------------------------------------------------------------------------
@router.get(
    "/status/{search_id}",
    response_model=SearchStatusResponse,
    summary="Check the status of a job search",
)
async def get_search_status(search_id: int) -> SearchStatusResponse:
    """
    Returns the current status of a job search: 'pending', 'running',
    'completed', or 'failed'.
    """
    # Check in-memory first (fast path)
    if search_id in _search_status:
        current_status = _search_status[search_id]
    else:
        # Fall back to DB
        async for db in get_db():
            rows = await db.execute_fetchall(
                "SELECT status FROM job_searches WHERE id = ? LIMIT 1",
                (search_id,),
            )
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Search with id={search_id} not found.",
            )
        current_status = rows[0]["status"]

    messages = {
        "pending": "Search is queued and will start shortly.",
        "running": "Search is in progress. Please check back in a few seconds.",
        "completed": "Search completed successfully. Retrieve results with /results/{search_id}.",
        "failed": "Search failed. Please try again.",
    }

    return SearchStatusResponse(
        search_id=search_id,
        status=current_status,
        message=messages.get(current_status, "Unknown status."),
    )
