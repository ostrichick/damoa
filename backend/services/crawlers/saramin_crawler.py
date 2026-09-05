"""
Saramin (사람인) Jobs Crawler
Scrapes public job listings from Saramin search.
"""

from __future__ import annotations

import logging
import urllib.parse
from typing import Any

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

SARAMIN_SEARCH_URL = "https://www.saramin.co.kr/zf_user/search"


async def crawl_saramin_jobs(
    query: str,
    location: str = "",
    num_jobs: int = 15,
) -> list[dict[str, Any]]:
    """
    Fetch public job listings from Saramin for *query*.
    Returns normalized job dicts.
    """
    jobs: list[dict[str, Any]] = []
    try:
        search_term = f"{query} 원격" if "remote" in location.lower() or "원격" in location else query
        url = f"{SARAMIN_SEARCH_URL}?searchword={urllib.parse.quote(search_term)}"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        }

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            r = await client.get(url, headers=headers)
            if r.status_code != 200:
                logger.warning("Saramin returned status %d", r.status_code)
                return []

            soup = BeautifulSoup(r.text, "html.parser")
            cards = soup.select(".item_recruit")

            for card in cards[:num_jobs]:
                title_el = card.select_one(".job_tit a")
                comp_el = card.select_one(".corp_name a")
                cond_els = card.select(".job_condition span")

                if not title_el or not comp_el:
                    continue

                title = title_el.text.strip()
                company = comp_el.text.strip()
                href = title_el.get("href", "")
                if href.startswith("/"):
                    job_url = f"https://www.saramin.co.kr{href}"
                else:
                    job_url = href

                loc_str = cond_els[0].text.strip() if len(cond_els) > 0 else (location or "Korea")
                exp_str = cond_els[1].text.strip() if len(cond_els) > 1 else ""

                jobs.append(
                    {
                        "title": title,
                        "company": company,
                        "location": loc_str,
                        "url": job_url,
                        "description_snippet": f"사람인 채용 공고 | 요건: {exp_str}" if exp_str else "사람인 채용 공고",
                        "posted_date": "채용시 마감",
                        "platform": "saramin",
                        "contract_type": "정규직",
                        "salary_type": "연봉",
                        "salary_amount": "회사내규에 따름",
                    }
                )

    except Exception as exc:
        logger.warning("Saramin crawler failed: %s", exc)

    return jobs
