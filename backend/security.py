"""Lightweight bearer-session authentication and per-session rate limiting."""

from __future__ import annotations

import asyncio
import os
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass

import aiosqlite
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import get_db


_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class SessionUser:
    id: int
    session_id: str


def _normalize_session_token(raw: str) -> str:
    try:
        return str(uuid.UUID(raw.strip()))
    except (ValueError, AttributeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def require_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> SessionUser:
    """Resolve an opaque browser-generated UUID bearer token to a DB user."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer session token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_id = _normalize_session_token(credentials.credentials)
    async for db in get_db():
        rows = await db.execute_fetchall(
            "SELECT id FROM users WHERE session_id = ? LIMIT 1",
            (session_id,),
        )
        if rows:
            return SessionUser(id=rows[0]["id"], session_id=session_id)

        try:
            cursor = await db.execute(
                "INSERT INTO users (session_id) VALUES (?)",
                (session_id,),
            )
            await db.commit()
            return SessionUser(id=cursor.lastrowid, session_id=session_id)  # type: ignore[arg-type]
        except aiosqlite.IntegrityError:
            rows = await db.execute_fetchall(
                "SELECT id FROM users WHERE session_id = ? LIMIT 1",
                (session_id,),
            )
            if rows:
                return SessionUser(id=rows[0]["id"], session_id=session_id)
            raise

    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        cutoff = now - window_seconds
        async with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, int(window_seconds - (now - events[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many expensive requests. Please retry later.",
                    headers={"Retry-After": str(retry_after)},
                )
            events.append(now)

    async def reset(self) -> None:
        async with self._lock:
            self._events.clear()


rate_limiter = SlidingWindowRateLimiter()


def _positive_int_env(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


async def enforce_resume_rate_limit(user: SessionUser) -> None:
    await rate_limiter.check(
        f"resume:{user.id}",
        _positive_int_env("RESUME_RATE_LIMIT", 5),
        60,
    )


async def enforce_job_search_rate_limit(user: SessionUser) -> None:
    await rate_limiter.check(
        f"job-search:{user.id}",
        _positive_int_env("JOB_SEARCH_RATE_LIMIT", 8),
        60,
    )
