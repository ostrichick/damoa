"""
LinkedIn Jobs Crawler (Fast HTTP / Guest Endpoint)
Scrapes public LinkedIn job listings without authentication or heavy headless browser overhead.
Strict 3.0s timeout to guarantee instant responses without hanging.
"""

from __future__ import annotations

import logging
import random
import urllib.parse
from typing import Any

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Realistic user-agent pool
# ---------------------------------------------------------------------------
_USER_AGENTS = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
]


# ---------------------------------------------------------------------------
# Public crawler function
# ---------------------------------------------------------------------------
async def crawl_linkedin_jobs(
    query: str,
    location: str = "",
    num_jobs: int = 15,
) -> list[dict[str, Any]]:
    """
    Fast HTTP-based public job listing fetcher for LinkedIn.
    Never blocks or hangs; strict 3.0s timeout with immediate fallback.
    """
    encoded_query = urllib.parse.quote_plus(query)
    encoded_location = urllib.parse.quote_plus(location) if location else "Korea"

    # LinkedIn public guest search endpoint
    url = (
        f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        f"?keywords={encoded_query}&location={encoded_location}&f_TPR=r604800&start=0"
    )

    headers = {
        "User-Agent": random.choice(_USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
    }

    try:
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            r = await client.get(url, headers=headers)
            if r.status_code != 200:
                logger.info("LinkedIn HTTP returned status %d", r.status_code)
                return []

            soup = BeautifulSoup(r.text, "html.parser")
            cards = soup.select("li")
            jobs: list[dict[str, Any]] = []

            for card in cards[:num_jobs]:
                title_el = card.select_one(".base-search-card__title, h3")
                comp_el = card.select_one(".base-search-card__subtitle, h4")
                loc_el = card.select_one(".job-search-card__location")
                link_el = card.select_one("a.base-card__full-link, a")
                time_el = card.select_one("time")

                if not title_el or not comp_el:
                    continue

                title = title_el.text.strip()
                company = comp_el.text.strip()
                loc = loc_el.text.strip() if loc_el else location or "Korea"
                raw_href = link_el.get("href", "") if link_el else "https://www.linkedin.com"
                clean_url = raw_href.split("?")[0] if "?" in raw_href else raw_href
                posted = time_el.text.strip() if time_el else "최근"

                jobs.append({
                    "title": title,
                    "company": company,
                    "location": loc,
                    "url": clean_url,
                    "description_snippet": f"{company} 채용 공고 (LinkedIn) · {title}",
                    "posted_date": posted,
                    "platform": "linkedin",
                })

            logger.info("LinkedIn fast fetch extracted %d jobs", len(jobs))
            return jobs

    except Exception as exc:
        logger.info("LinkedIn fast fetch skipped: %s", exc)
        return []
