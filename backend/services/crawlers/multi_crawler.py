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

    # Launch all 4 crawlers concurrently
    results = await asyncio.gather(
        crawl_linkedin_jobs(query, location, num_jobs=per_platform),
        crawl_wanted_jobs(query, location, num_jobs=per_platform),
        crawl_saramin_jobs(query, location, num_jobs=per_platform),
        crawl_remoteok_jobs(query, location, num_jobs=per_platform),
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
