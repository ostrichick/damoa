"""
Job Matching Engine
Scores job listings against a candidate's AI-extracted profile.
"""

from __future__ import annotations

import re
from typing import Any

from services.platform_trust import get_platform_trust_info

# ---------------------------------------------------------------------------
# Large curated skills dictionary (used for keyword extraction from JDs)
# ---------------------------------------------------------------------------
KNOWN_SKILLS: list[str] = [
    # --- Languages ---
    "Python", "JavaScript", "TypeScript", "Java", "Kotlin", "Swift",
    "C", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Scala", "R",
    "MATLAB", "Perl", "Dart", "Elixir", "Haskell", "Lua", "Julia",
    "Bash", "Shell", "PowerShell", "SQL", "PL/SQL", "T-SQL",

    # --- Web / Front-end ---
    "HTML", "CSS", "SASS", "SCSS", "React", "React Native", "Next.js",
    "Vue", "Vue.js", "Nuxt.js", "Angular", "Svelte", "jQuery",
    "Webpack", "Vite", "Babel", "Tailwind", "Bootstrap", "Material UI",
    "Redux", "Zustand", "MobX", "GraphQL", "REST", "RESTful", "WebSocket",

    # --- Back-end / Frameworks ---
    "FastAPI", "Flask", "Django", "Spring", "Spring Boot", "Express",
    "NestJS", "Laravel", "Rails", "Ruby on Rails", "ASP.NET", ".NET",
    "Gin", "Fiber", "Actix", "Axum", "Ktor",

    # --- Databases ---
    "PostgreSQL", "MySQL", "MariaDB", "SQLite", "MongoDB", "Redis",
    "Cassandra", "DynamoDB", "Elasticsearch", "Neo4j", "CockroachDB",
    "Firestore", "Supabase", "Prisma", "SQLAlchemy", "Mongoose",

    # --- Cloud & DevOps ---
    "AWS", "GCP", "Azure", "Heroku", "Vercel", "Netlify", "DigitalOcean",
    "Docker", "Kubernetes", "Helm", "Terraform", "Ansible", "Chef",
    "Puppet", "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI",
    "ArgoCD", "Istio", "Prometheus", "Grafana", "Datadog", "Sentry",
    "Nginx", "Apache", "Caddy",

    # --- AI / ML ---
    "TensorFlow", "PyTorch", "Keras", "scikit-learn", "XGBoost",
    "LightGBM", "Pandas", "NumPy", "SciPy", "Matplotlib", "Seaborn",
    "Hugging Face", "LangChain", "OpenAI", "Gemini", "BERT", "GPT",
    "LLM", "RAG", "NLP", "Computer Vision", "OpenCV", "YOLO",
    "MLflow", "Airflow", "Spark", "Kafka",

    # --- AI Annotation, Evaluation & Language ---
    "AI Data Annotation", "Data Annotation", "AI Evaluation", "Model Evaluation",
    "Conversational AI", "Conversation Evaluation", "Prompt Engineering", "Data Labeling",
    "Transcription", "Rubric-Based QA", "Audio Review", "Data Analysis",
    "Korean", "English", "Spanish", "Japanese", "Chinese",
    "Localization", "Translation", "Content Moderation",
    "Instruction Following", "RLHF", "SFT", "Quality Assurance",

    # --- Communications, Marketing & Content Creation ---
    "Digital Marketing", "Social Media", "Social Media Management", "Social Media Marketing",
    "Content Creation", "Content Creator", "Content Marketing", "Copywriting",
    "Meta Business Suite", "Facebook Ads", "Instagram Marketing", "YouTube SEO",
    "YouTube Analytics", "Canva", "Video Editing", "Audiovisual Communications",
    "Public Relations", "PR", "Community Management", "Multilingual Communication",
    "Market Research", "Campaign Management",

    # --- Interpretation & Translation ---
    "Medical Interpreter", "Medical Interpretation", "Healthcare Interpretation",
    "Simultaneous Interpretation", "Consecutive Interpretation",
    "Spanish Interpretation", "English Interpretation", "Document Translation",

    # --- Language Teaching & Education ---
    "English Teaching", "Spanish Teaching", "Language Instructor", "ESL", "EFL",
    "Foreign Language Instructor", "Tutoring", "Curriculum Development",
    "Student Assessment", "Digital Classroom",

    # --- Mobile ---
    "Android", "iOS", "Flutter", "React Native", "Xamarin",
    "Jetpack Compose", "SwiftUI", "UIKit",

    # --- Testing ---
    "pytest", "Jest", "Mocha", "Cypress", "Selenium", "Playwright",
    "JUnit", "TestNG", "Postman",

    # --- Methodologies / Soft skills ---
    "Agile", "Scrum", "Kanban", "TDD", "BDD", "CI/CD",
    "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence",
    "Figma", "Sketch", "Adobe XD",

    # --- Security ---
    "OAuth", "JWT", "SSL/TLS", "OWASP", "Penetration Testing",
    "Cryptography", "SSO", "SAML",

    # --- Miscellaneous ---
    "Linux", "Ubuntu", "CentOS", "macOS", "Windows Server",
    "Microservices", "Serverless", "Event-driven", "gRPC", "Protobuf",
    "RabbitMQ", "SQS", "PubSub", "Websockets",
]

# Pre-compiled pattern for speed
_SKILLS_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(s) for s in KNOWN_SKILLS) + r")\b",
    re.IGNORECASE,
)

# Education level scores (higher = more advanced)
_EDUCATION_SCORES: dict[str, int] = {
    "phd": 4,
    "doctorate": 4,
    "master": 3,
    "msc": 3,
    "mba": 3,
    "bachelor": 2,
    "bsc": 2,
    "ba ": 2,
    "associate": 1,
    "diploma": 1,
    "high school": 0,
}

# Level ordinal mapping
_LEVEL_ORDINAL: dict[str, int] = {
    "junior": 0,
    "mid": 1,
    "senior": 2,
    "lead": 3,
}

# Typical years ranges per level (midpoint used for scoring)
_LEVEL_YEARS: dict[str, float] = {
    "junior": 1.0,
    "mid": 3.0,
    "senior": 7.0,
    "lead": 12.0,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def extract_required_skills_from_job(job_description: str) -> list[str]:
    """
    Extract technology/skill keywords from a job description using the
    curated KNOWN_SKILLS list (case-insensitive, no LLM required).

    Returns a de-duplicated list preserving original casing from KNOWN_SKILLS.
    """
    if not job_description:
        return []

    found: dict[str, str] = {}  # lower -> original casing
    for match in _SKILLS_PATTERN.finditer(job_description):
        lower = match.group(0).lower()
        if lower not in found:
            # Use the canonical casing from KNOWN_SKILLS
            canonical = next(
                (s for s in KNOWN_SKILLS if s.lower() == lower), match.group(0)
            )
            found[lower] = canonical

    return list(found.values())


def match_jobs_to_profile(
    profile: dict[str, Any],
    jobs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Score each job in *jobs* against *profile* and return the enriched list
    sorted by match_score descending.

    Scoring weights:
      - skill_score      40 %
      - experience_score 25 %
      - domain_score     20 %
      - education_score  15 %
    """
    candidate_skills = _normalise_skill_set(profile.get("skills", []))
    candidate_level = profile.get("level", "mid")
    candidate_years = float(profile.get("total_years_experience") or 0)
    candidate_domains = [d.lower() for d in profile.get("domains", [])]
    candidate_education = _highest_education(profile.get("education", []))

    enriched: list[dict[str, Any]] = []

    for job in jobs:
        description = job.get("description_snippet", "") + " " + job.get("description", "")
        title = job.get("title", "")

        # Infer job level from title keywords
        job_level = _infer_job_level(title + " " + description)
        job_domains = _extract_domains(title + " " + description)
        required_skills = extract_required_skills_from_job(description + " " + title)
        required_skills_lower = {s.lower() for s in required_skills}

        # ── Skill score ──────────────────────────────────────────────────
        matched = [s for s in candidate_skills if s.lower() in required_skills_lower]
        missing = [
            s for s in required_skills
            if s.lower() not in {c.lower() for c in candidate_skills}
        ]
        if required_skills:
            skill_pct = len(matched) / len(required_skills)
        else:
            # If no skills listed in JD, assume partial match
            skill_pct = 0.5
        skill_score = round(skill_pct * 40, 2)

        # ── Experience score ─────────────────────────────────────────────
        exp_score = _experience_score(candidate_level, candidate_years, job_level)

        # ── Domain score ─────────────────────────────────────────────────
        domain_score = _domain_score(candidate_domains, job_domains)

        # ── Education score ──────────────────────────────────────────────
        edu_score = _education_score(candidate_education)

        salary_type, salary_amount = _extract_salary_info(title + " " + description)
        contract_type = _extract_contract_type(title + " " + description)
        trust_info = get_platform_trust_info(job.get("company", ""), job.get("platform", ""), job.get("url", ""))

        # ── Custom prompt bonus score ─────────────────────────────────────
        custom_prompt = profile.get("custom_prompt", "")
        custom_bonus = _custom_prompt_score(custom_prompt, title, description, trust_info)

        total_score = round(skill_score + exp_score + domain_score + edu_score + custom_bonus, 1)
        total_score = max(0.0, min(100.0, total_score))

        enriched.append(
            {
                **job,
                "match_score": total_score,
                "matched_skills": matched,
                "missing_skills": missing[:10],  # cap for readability
                "job_level_inferred": job_level,
                "contract_type": job.get("contract_type") or contract_type,
                "salary_type": job.get("salary_type") or salary_type,
                "salary_amount": job.get("salary_amount") or salary_amount,
                "trust_badge": trust_info.get("badge", "🟢 정식 채용"),
                "trust_rating": trust_info.get("rating", "HIGH"),
                "payment_methods": trust_info.get("payment_methods", ["통장 입금", "PayPal"]),
                "payment_cycle": trust_info.get("payment_cycle", "월급 / 주급"),
                "trust_summary": trust_info.get("summary", ""),
                "score_breakdown": {
                    "skill_score": skill_score,
                    "experience_score": exp_score,
                    "domain_score": domain_score,
                    "education_score": edu_score,
                },
            }
        )

    # Sort best-match first
    enriched.sort(key=lambda j: j["match_score"], reverse=True)
    return enriched


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _extract_salary_info(text: str) -> tuple[str, str]:
    """
    Extract (salary_type, salary_amount) from title & description text.
    Returns e.g. ("연봉", "4,500만~6,000만원"), ("월급", "월 350만원"), ("시급", "시급 15,000원"), or ("연봉", "회사내규에 따름")
    """
    text_lower = text.lower()

    annual_match = re.search(r'(연봉|연)\s*[:\s]?\s*([\d,]+(?:\s*~\s*[\d,]+)?\s*(?:만\s*원|만원|원))', text, re.IGNORECASE)
    if annual_match:
        return ("연봉", annual_match.group(2).strip())

    monthly_match = re.search(r'(월급|월)\s*[:\s]?\s*([\d,]+(?:\s*~\s*[\d,]+)?\s*(?:만\s*원|만원|원))', text, re.IGNORECASE)
    if monthly_match:
        return ("월급", monthly_match.group(2).strip())

    hourly_match = re.search(r'(시급)\s*[:\s]?\s*([\d,]+(?:\s*~\s*[\d,]+)?\s*원)', text, re.IGNORECASE)
    if hourly_match:
        return ("시급", hourly_match.group(2).strip())

    usd_match = re.search(r'(\$\s*[\d,]+(?:\s*-\s*\$\s*[\d,]+)?\s*(?:/\s*(?:yr|year|hr|hour|mo|month))?)', text, re.IGNORECASE)
    if usd_match:
        val = usd_match.group(1)
        if "/hr" in val or "hour" in val:
            return ("시급", val)
        if "/mo" in val or "month" in val:
            return ("월급", val)
        return ("연봉", val)

    if "인턴" in text or "intern" in text_lower:
        return ("월급", "월 220만 ~ 260만원")
    if "파트타임" in text or "part-time" in text_lower or "part time" in text_lower:
        return ("시급", "시급 12,000 ~ 15,000원")
    if "프리랜서" in text or "freelance" in text_lower:
        return ("월급", "월 500만 ~ 800만원")

    return ("연봉", "회사내규 (면접후 결정)")


def _custom_prompt_score(custom_prompt: str, title: str, description: str, trust_info: dict[str, Any]) -> float:
    """Bonus score (0-15) based on custom prompt natural language match."""
    if not custom_prompt:
        return 0.0

    cp = custom_prompt.lower()
    text = (title + " " + description + " " + str(trust_info.get("payment_methods", []))).lower()

    matches = 0
    keywords = ["한국어", "korean", "원격", "remote", "ai", "llm", "평가", "evaluator", "시급", "월급", "페이팔", "paypal", "파트타임", "프리랜서"]

    for kw in keywords:
        if kw in cp and kw in text:
            matches += 1

    return min(15.0, matches * 3.0)


def _extract_contract_type(text: str) -> str:
    """Extract contract type: 정규직, 계약직, 인턴, 파트타임, 프리랜서."""
    text_lower = text.lower()
    if "계약직" in text or "contract" in text_lower:
        return "계약직"
    if "인턴" in text or "intern" in text_lower:
        return "인턴"
    if "파트타임" in text or "part-time" in text_lower or "part time" in text_lower:
        return "파트타임"
    if "프리랜서" in text or "freelance" in text_lower:
        return "프리랜서"
    return "정규직"


def _normalise_skill_set(skills: list[str]) -> list[str]:
    """De-duplicate skills ignoring case."""
    seen: set[str] = set()
    out: list[str] = []
    for s in skills:
        if s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out


def _infer_job_level(text: str) -> str:
    text_lower = text.lower()
    if any(k in text_lower for k in ("lead", "principal", "staff", "vp", "head of", "director")):
        return "lead"
    if any(k in text_lower for k in ("senior", "sr.", "sr ")):
        return "senior"
    if any(k in text_lower for k in ("junior", "jr.", "jr ", "entry level", "entry-level", "graduate", "intern")):
        return "junior"
    return "mid"


def _experience_score(
    candidate_level: str,
    candidate_years: float,
    job_level: str,
) -> float:
    """
    Returns 0-25 based on how well the candidate's seniority matches
    the job's expected seniority.
    """
    c_ord = _LEVEL_ORDINAL.get(candidate_level, 1)
    j_ord = _LEVEL_ORDINAL.get(job_level, 1)
    diff = abs(c_ord - j_ord)

    if diff == 0:
        return 25.0
    if diff == 1:
        return 17.0
    if diff == 2:
        return 8.0
    return 2.0


def _extract_domains(text: str) -> list[str]:
    domain_keywords = {
        "fintech": ["fintech", "finance", "banking", "payments", "cryptocurrency", "blockchain"],
        "e-commerce": ["e-commerce", "ecommerce", "marketplace", "retail", "shopping"],
        "healthtech": ["healthcare", "health", "medical", "biotech", "pharma", "clinical"],
        "edtech": ["education", "edtech", "learning", "e-learning", "lms"],
        "logistics": ["logistics", "supply chain", "delivery", "shipping", "warehouse"],
        "saas": ["saas", "b2b", "platform", "subscription"],
        "gaming": ["gaming", "game", "unity", "unreal"],
        "media": ["media", "streaming", "content", "video", "music"],
        "security": ["security", "cybersecurity", "infosec", "penetration"],
        "ai": ["artificial intelligence", "machine learning", "ai", "ml", "deep learning"],
        "hr": ["hr", "human resources", "recruitment", "talent"],
    }
    text_lower = text.lower()
    found: list[str] = []
    for domain, keywords in domain_keywords.items():
        if any(k in text_lower for k in keywords):
            found.append(domain)
    return found


def _domain_score(candidate_domains: list[str], job_domains: list[str]) -> float:
    """Returns 0-20 based on domain overlap."""
    if not job_domains:
        return 10.0  # neutral if we can't determine
    if not candidate_domains:
        return 5.0
    overlap = set(candidate_domains) & set(job_domains)
    pct = len(overlap) / len(job_domains)
    return round(pct * 20, 2)


def _highest_education(education: list[dict[str, Any]]) -> int:
    """Return the highest education level ordinal for the candidate."""
    highest = 0
    for edu in education:
        degree_text = (edu.get("degree", "") + " " + edu.get("field", "")).lower()
        for keyword, score in _EDUCATION_SCORES.items():
            if keyword in degree_text:
                highest = max(highest, score)
    return highest


def _education_score(edu_level: int) -> float:
    """Map education ordinal (0-4) to a 0-15 score."""
    mapping = {0: 5.0, 1: 9.0, 2: 12.0, 3: 14.0, 4: 15.0}
    return mapping.get(edu_level, 5.0)
