"""
Multi-Platform Parallel Jobs Crawler
Concurrently queries LinkedIn, Wanted, Saramin, and RemoteOK via asyncio.gather.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from services.crawlers.linkedin_crawler import crawl_linkedin_jobs
from services.crawlers.wanted_crawler import crawl_wanted_jobs
from services.crawlers.saramin_crawler import crawl_saramin_jobs
from services.crawlers.remoteok_crawler import crawl_remoteok_jobs

logger = logging.getLogger(__name__)


async def crawl_multi_platform_jobs(
    query: str,
    location: str = "",
    num_jobs: int = 20,
) -> list[dict[str, Any]]:
    """
    Run all platform crawlers in parallel via asyncio.gather.
    Returns merged, de-duplicated job listings.
    """
    per_platform = max(5, num_jobs // 3)

    logger.info("Starting multi-platform crawl for query='%s', location='%s'...", query, location)

    async def _safe_crawl(coro, platform_name: str) -> list[dict[str, Any]]:
        try:
            return await asyncio.wait_for(coro, timeout=3.5)
        except Exception as exc:
            logger.info("Crawler %s timed out or skipped: %s", platform_name, exc)
            return []

    # Launch all 4 crawlers concurrently with strict individual 3.5s timeouts
    results = await asyncio.gather(
        _safe_crawl(crawl_wanted_jobs(query, location, num_jobs=per_platform), "Wanted"),
        _safe_crawl(crawl_saramin_jobs(query, location, num_jobs=per_platform), "Saramin"),
        _safe_crawl(crawl_remoteok_jobs(query, location, num_jobs=per_platform), "RemoteOK"),
        _safe_crawl(crawl_linkedin_jobs(query, location, num_jobs=per_platform), "LinkedIn"),
        return_exceptions=True,
    )

    combined: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    for idx, res in enumerate(results):
        if isinstance(res, Exception):
            logger.warning("Crawler index %d encountered error: %s", idx, res)
            continue
        if isinstance(res, list):
            for job in res:
                # De-duplicate by company + title key
                key = f"{job.get('company', '').lower().strip()}:{job.get('title', '').lower().strip()}"
                if key not in seen_keys and job.get("title"):
                    seen_keys.add(key)
                    combined.append(job)

    logger.info("Multi-platform crawl complete: %d unique jobs gathered", len(combined))

    return combined[:num_jobs]
