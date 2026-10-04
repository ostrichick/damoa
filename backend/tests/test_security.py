from __future__ import annotations

import asyncio
import os
import sqlite3
import tempfile
import unittest
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import database
import main
from routers import resume as resume_router
from security import rate_limiter


def _profile(name: str = "Synthetic Candidate") -> dict[str, object]:
    return {
        "name": name,
        "email": "candidate@example.invalid",
        "phone": "+82-10-0000-0099",
        "skills": ["Python", "Korean"],
        "experience": [],
        "education": [],
        "total_years_experience": 1.0,
        "level": "mid",
        "domains": ["AI/Data"],
        "languages": ["Korean"],
        "summary": "Synthetic profile used by the security test suite.",
    }


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class ApiSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.original_db_path = database._DB_PATH
        database._DB_PATH = os.path.join(self.tempdir.name, "test.db")
        asyncio.run(database.init_db())
        asyncio.run(rate_limiter.reset())
        self.client = TestClient(main.create_app())
        self.token_a = str(uuid.uuid4())
        self.token_b = str(uuid.uuid4())

    def tearDown(self) -> None:
        self.client.close()
        database._DB_PATH = self.original_db_path
        self.tempdir.cleanup()
        os.environ.pop("RESUME_RATE_LIMIT", None)

    def _create_resume(self, token: str) -> int:
        body = {
            "text": "Synthetic resume text with enough detail for validation and analysis. " * 2,
            "filename": "synthetic.txt",
        }
        with patch.object(
            resume_router,
            "analyze_resume",
            new=AsyncMock(return_value=_profile()),
        ):
            response = self.client.post("/api/resume/text", json=body, headers=_auth(token))
        self.assertEqual(response.status_code, 201, response.text)
        return int(response.json()["profile"]["resume_id"])

    def test_resume_api_requires_bearer_session(self) -> None:
        response = self.client.get("/api/resume/latest")
        self.assertEqual(response.status_code, 401)

    def test_resume_is_visible_only_to_owner(self) -> None:
        resume_id = self._create_resume(self.token_a)

        owner = self.client.get(f"/api/resume/{resume_id}", headers=_auth(self.token_a))
        other = self.client.get(f"/api/resume/{resume_id}", headers=_auth(self.token_b))

        self.assertEqual(owner.status_code, 200)
        self.assertEqual(other.status_code, 404)

    def test_job_endpoints_enforce_resume_and_search_ownership(self) -> None:
        resume_id = self._create_resume(self.token_a)
        denied_search = self.client.post(
            "/api/jobs/search",
            headers=_auth(self.token_b),
            json={"resume_id": resume_id, "location": "Remote", "num_results": 1},
        )
        self.assertEqual(denied_search.status_code, 404)

        with sqlite3.connect(database._DB_PATH) as db:
            cursor = db.execute(
                "INSERT INTO job_searches (resume_id, search_query, location, status) VALUES (?, ?, ?, ?)",
                (resume_id, "Synthetic", "Remote", "completed"),
            )
            search_id = int(cursor.lastrowid)
            db.commit()

        for suffix in (f"status/{search_id}", f"results/{search_id}"):
            owner = self.client.get(f"/api/jobs/{suffix}", headers=_auth(self.token_a))
            other = self.client.get(f"/api/jobs/{suffix}", headers=_auth(self.token_b))
            self.assertEqual(owner.status_code, 200, owner.text)
            self.assertEqual(other.status_code, 404, other.text)

    def test_expensive_resume_analysis_is_rate_limited_per_session(self) -> None:
        os.environ["RESUME_RATE_LIMIT"] = "2"
        asyncio.run(rate_limiter.reset())
        body = {"text": "Synthetic resume text with enough content for analysis. " * 2}

        with patch.object(
            resume_router,
            "analyze_resume",
            new=AsyncMock(return_value=_profile()),
        ):
            first = self.client.post("/api/resume/text", json=body, headers=_auth(self.token_a))
            second = self.client.post("/api/resume/text", json=body, headers=_auth(self.token_a))
            limited = self.client.post("/api/resume/text", json=body, headers=_auth(self.token_a))

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(limited.status_code, 429)
        self.assertIn("Retry-After", limited.headers)


if __name__ == "__main__":
    unittest.main()
