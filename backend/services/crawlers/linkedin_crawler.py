"""
LinkedIn Jobs Crawler (Playwright)
Scrapes public LinkedIn job listings without authentication.
"""

from __future__ import annotations

import asyncio
import logging
import random
import urllib.parse
from typing import Any

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
    num_jobs: int = 20,
) -> list[dict[str, Any]]:
    """
    Crawl LinkedIn public job listings for *query* (and optional *location*).

    Returns a list of job dicts:
    {
        "title": str,
        "company": str,
        "location": str,
        "url": str,
        "description_snippet": str,
        "posted_date": str,
        "platform": "linkedin",
    }

    Falls back to an empty list on any unrecoverable error so the rest of
    the pipeline keeps working.
    """
    try:
        from playwright.async_api import async_playwright, TimeoutError as PWTimeout
    except ImportError:
        logger.error("playwright is not installed. Run: pip install playwright && playwright install chromium")
        return []

    encoded_query = urllib.parse.quote_plus(query)
    encoded_location = urllib.parse.quote_plus(location) if location else ""

    base_url = "https://www.linkedin.com/jobs/search/"
    params = f"?keywords={encoded_query}"
    if encoded_location:
        params += f"&location={encoded_location}"
    params += "&f_TPR=r86400"  # last 24 hours filter
    url = base_url + params

    jobs: list[dict[str, Any]] = []

    for attempt in range(1, 4):  # up to 3 retries
        try:
            jobs = await _do_crawl(url, num_jobs)
            if jobs:
                break
            logger.warning("LinkedIn crawl attempt %d returned 0 jobs, retrying…", attempt)
            await asyncio.sleep(random.uniform(2, 5))
        except Exception as exc:  # noqa: BLE001
            logger.warning("LinkedIn crawl attempt %d failed: %s", attempt, exc)
            await asyncio.sleep(random.uniform(3, 7))

    return jobs


async def _do_crawl(url: str, num_jobs: int) -> list[dict[str, Any]]:
    """Inner coroutine that actually runs Playwright."""
    from playwright.async_api import async_playwright

    user_agent = random.choice(_USER_AGENTS)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = await browser.new_context(
            user_agent=user_agent,
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/New_York",
            java_script_enabled=True,
        )
        # Hide webdriver flag
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = await context.new_page()

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)

            # Random human-like delay
            await asyncio.sleep(random.uniform(1.5, 3.5))

            # LinkedIn may show a sign-in gate – try to dismiss it
            try:
                dismiss_btn = page.locator("[data-tracking-control-name='public_jobs_sign-in-gate_close']")
                if await dismiss_btn.is_visible(timeout=3000):
                    await dismiss_btn.click()
                    await asyncio.sleep(0.5)
            except Exception:
                pass

            # Wait for job cards to appear
            await page.wait_for_selector(
                "ul.jobs-search__results-list li, .base-search-card",
                timeout=15_000,
            )

            jobs = await _extract_job_cards(page, num_jobs)
        finally:
            await browser.close()

    return jobs


async def _extract_job_cards(page: Any, num_jobs: int) -> list[dict[str, Any]]:
    """Parse job cards from the current LinkedIn jobs search page."""
    from playwright.async_api import TimeoutError as PWTimeout

    jobs: list[dict[str, Any]] = []

    # Scroll down to trigger lazy loading
    for _ in range(min(num_jobs // 5, 6)):
        await page.evaluate("window.scrollBy(0, 600)")
        await asyncio.sleep(random.uniform(0.4, 0.9))

    # Try to grab all job cards
    cards = await page.query_selector_all(
        "ul.jobs-search__results-list li.result-card, "
        "li.jobs-search__result-item, "
        ".base-search-card"
    )

    if not cards:
        # Fallback selector set
        cards = await page.query_selector_all(".job-search-card")

    for card in cards[:num_jobs]:
        try:
            title = await _safe_inner_text(card, "h3.base-search-card__title, h3.result-card__title")
            company = await _safe_inner_text(card, "h4.base-search-card__subtitle, h4.result-card__subtitle")
            location = await _safe_inner_text(card, ".job-search-card__location, .result-card__location")
            posted_date = await _safe_inner_text(card, "time, .job-search-card__listdate")
            snippet = await _safe_inner_text(card, ".base-search-card__metadata, .result-card__snippet")

            # Extract URL
            link_el = await card.query_selector("a.base-card__full-link, a.result-card__full-card-link")
            href = ""
            if link_el:
                href = await link_el.get_attribute("href") or ""
                # Strip tracking parameters after the job ID
                href = href.split("?")[0] if "?" in href else href

            if not title:
                continue

            jobs.append(
                {
                    "title": title.strip(),
                    "company": company.strip(),
                    "location": location.strip(),
                    "url": href.strip(),
                    "description_snippet": snippet.strip(),
                    "posted_date": posted_date.strip(),
                    "platform": "linkedin",
                }
            )
        except Exception as exc:  # noqa: BLE001
            logger.debug("Failed to parse a job card: %s", exc)
            continue

    return jobs


async def _safe_inner_text(element: Any, selector: str) -> str:
    """Return inner text of the first matching child element, or empty string."""
    try:
        el = await element.query_selector(selector)
        if el:
            return await el.inner_text()
    except Exception:
        pass
    return ""
