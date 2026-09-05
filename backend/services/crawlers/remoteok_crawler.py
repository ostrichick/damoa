"""
RemoteOK Jobs Crawler
Fetches global AI & tech remote jobs from RemoteOK public REST API.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

REMOTEOK_API_URL = "https://remoteok.com/api"


async def crawl_remoteok_jobs(
    query: str,
    location: str = "",
    num_jobs: int = 15,
) -> list[dict[str, Any]]:
    """
    Fetch global remote AI/tech jobs from RemoteOK API.
    Returns normalized job dicts.
    """
    jobs: list[dict[str, Any]] = []
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            r = await client.get(REMOTEOK_API_URL, headers=headers)
            if r.status_code != 200:
                logger.warning("RemoteOK API returned status %d", r.status_code)
                return []

            data = r.json()
            raw_items = [j for j in data if isinstance(j, dict) and "position" in j]

            # Filter by query terms if provided
            query_terms = [t.lower() for t in query.split() if len(t) > 1]

            for item in raw_items:
                title = item.get("position", "").strip()
                company = item.get("company", "").strip()
                tags = item.get("tags", [])
                tag_str = " ".join(tags).lower() if isinstance(tags, list) else ""
                desc = item.get("description", "")[:400]
                url = item.get("url", "") or item.get("apply_url", "https://remoteok.com")
                sal_min = item.get("salary_min", 0)
                sal_max = item.get("salary_max", 0)

                # Match query
                full_text = f"{title} {company} {tag_str}".lower()
                if query_terms and not any(term in full_text for term in query_terms):
                    continue

                salary_str = f"${sal_min:,} - ${sal_max:,} / yr" if sal_min and sal_max else "경력별 협의"

                jobs.append(
                    {
                        "title": title,
                        "company": company,
                        "location": item.get("location") or "Worldwide Remote",
                        "url": url,
                        "description_snippet": f"RemoteOK Global Job | 태그: {', '.join(tags[:4]) if isinstance(tags, list) else ''}",
                        "posted_date": "최근 등록",
                        "platform": "remoteok",
                        "contract_type": "프리랜서 / 정규직",
                        "salary_type": "연봉",
                        "salary_amount": salary_str,
                    }
                )

                if len(jobs) >= num_jobs:
                    break

    except Exception as exc:
        logger.warning("RemoteOK crawler failed: %s", exc)

    return jobs
