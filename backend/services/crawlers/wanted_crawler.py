"""
Wanted (원티드) Jobs Crawler
Fetches public IT/Tech job listings from Wanted REST API.
"""

from __future__ import annotations

import logging
import urllib.parse
from typing import Any

import httpx

logger = logging.getLogger(__name__)

WANTED_API_BASE = "https://www.wanted.co.kr/api/v4/jobs"


async def crawl_wanted_jobs(
    query: str,
    location: str = "",
    num_jobs: int = 15,
) -> list[dict[str, Any]]:
    """
    Fetch public job listings from Wanted API for *query*.
    Returns normalized job dicts.
    """
    jobs: list[dict[str, Any]] = []
    try:
        url = f"{WANTED_API_BASE}?query={urllib.parse.quote(query)}&country=all&limit={min(num_jobs, 30)}"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, headers=headers)
            if r.status_code != 200:
                logger.warning("Wanted API returned status %d", r.status_code)
                return []

            data = r.json()
            raw_jobs = data.get("data", [])

            for item in raw_jobs[:num_jobs]:
                job_id = item.get("id")
                title = item.get("position", "").strip()
                company_info = item.get("company", {})
                company = company_info.get("name", "").strip()
                loc_info = item.get("address", {})
                loc_str = loc_info.get("location", "") or location or "Korea / Remote"
                reward = item.get("reward", {})
                total_reward = reward.get("formatted_total", "")

                job_url = f"https://www.wanted.co.kr/wd/{job_id}" if job_id else "https://www.wanted.co.kr"

                if not title or not company:
                    continue

                jobs.append(
                    {
                        "title": title,
                        "company": company,
                        "location": loc_str,
                        "url": job_url,
                        "description_snippet": f"원티드 채용 공고 | 보상금: {total_reward}" if total_reward else "원티드 채용 공고",
                        "posted_date": "상시 채용",
                        "platform": "wanted",
                        "contract_type": "정규직",
                        "salary_type": "연봉",
                        "salary_amount": "회사내규에 따름",
                    }
                )

    except Exception as exc:
        logger.warning("Wanted crawler failed: %s", exc)

    return jobs
