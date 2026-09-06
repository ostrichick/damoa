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
    Score each job against candidate profile with distinctive, granular evaluation:
      1. Role & Title Match  (0 ~ 35 pts)
      2. Location Alignment  (0 ~ 25 pts)
      3. Skills Overlap      (0 ~ 20 pts)
      4. Experience & Edu    (0 ~ 10 pts)
      5. Platform Trust      (0 ~ 10 pts)
    Also generates a clear human-readable match_reason explaining the score.
    """
    candidate_skills = _normalise_skill_set(profile.get("skills", []))
    candidate_languages = [lang.lower() for lang in profile.get("languages", [])]
    candidate_domains = [d.lower() for d in profile.get("domains", [])]
    candidate_level = profile.get("level", "mid")
    candidate_years = float(profile.get("total_years_experience") or 0)
    candidate_education = _highest_education(profile.get("education", []))
    custom_prompt = (profile.get("custom_prompt") or "").lower()

    # Determine desired location preference
    target_loc = ""
    if any(w in custom_prompt for w in ("전주", "전북", "jeonju")):
        target_loc = "jeonju"
    elif any(w in custom_prompt for w in ("서울", "seoul")):
        target_loc = "seoul"
    elif any(w in custom_prompt for w in ("원격", "remote", "재택")):
        target_loc = "remote"

    is_spanish_user = any("spanish" in s.lower() or "스페인어" in s.lower() for s in candidate_skills) or "spanish" in candidate_languages
    is_english_user = any("english" in s.lower() or "영어" in s.lower() for s in candidate_skills) or "english" in candidate_languages
    is_ai_user = any("ai" in s.lower() or "llm" in s.lower() or "evaluat" in s.lower() for s in candidate_skills)

    enriched: list[dict[str, Any]] = []

    for job in jobs:
        description = job.get("description_snippet", "") + " " + job.get("description", "")
        title = job.get("title", "")
        job_loc = (job.get("location") or "").lower()
        full_text = (title + " " + description).lower()
        title_lower = title.lower()

        reasons_pos: list[str] = []
        reasons_neg: list[str] = []

        # ── 1. Role & Title Relevance Score (0 ~ 35 pts) ──────────────────────
        role_pts = 4.0

        if is_spanish_user and any(w in title_lower for w in ("스페인어", "spanish", "에스파뇰")):
            role_pts += 18.0
            reasons_pos.append("스페인어 직무")
        if any(w in title_lower for w in ("통역", "번역", "interpreter", "translation")):
            role_pts += 14.0
            reasons_pos.append("통번역 직무")
        if is_english_user and any(w in title_lower for w in ("영어", "english", "강사", "teacher")):
            role_pts += 12.0
            reasons_pos.append("어학 교육/강사")
        if any(w in title_lower for w in ("마케팅", "marketing", "콘텐츠", "content", "canva", "소셜미디어")):
            role_pts += 13.0
            reasons_pos.append("마케팅/콘텐츠")
        if is_ai_user and any(w in title_lower for w in ("ai", "llm", "데이터", "평가", "라벨링", "evaluator", "annotation", "qa")):
            role_pts += 20.0
            reasons_pos.append("AI 데이터 평가")

        # Fallback skill match in title
        for skill in candidate_skills:
            if len(skill) > 2 and skill.lower() in title_lower and skill.lower() not in ("korean", "english", "spanish"):
                role_pts += 5.0
                reasons_pos.append(f"{skill} 매칭")
                break

        role_pts = min(35.0, role_pts)
        if role_pts <= 6.0:
            reasons_neg.append("이력서 직무와의 직접 연관성 낮음")

        # ── 2. Location Alignment Score (0 ~ 25 pts) ──────────────────────────
        loc_pts = 10.0
        if target_loc == "jeonju":
            if any(w in job_loc for w in ("전주", "전북", "jeonju")):
                loc_pts = 25.0
                reasons_pos.append("전주/전북 근무지 일치")
            elif any(w in job_loc for w in ("재택", "원격", "remote", "wfh")):
                loc_pts = 20.0
                reasons_pos.append("재택/원격 가능")
            elif any(w in job_loc for w in ("서울", "경기", "수도권")):
                loc_pts = 12.0
                reasons_neg.append("근무지 서울")
            elif any(w in job_loc for w in ("멕시코", "베트남", "해외", "북·중미")):
                loc_pts = 4.0
                reasons_neg.append("해외 근무(감점)")
            else:
                loc_pts = 8.0
                reasons_neg.append("타지역")
        elif target_loc == "seoul":
            if any(w in job_loc for w in ("서울", "경기", "수도권", "강남", "판교")):
                loc_pts = 25.0
                reasons_pos.append("서울/수도권 일치")
            elif any(w in job_loc for w in ("재택", "원격", "remote")):
                loc_pts = 20.0
            else:
                loc_pts = 8.0
                reasons_neg.append("지방 근무")
        elif target_loc == "remote":
            if any(w in job_loc for w in ("재택", "원격", "remote", "worldwide", "wfh")):
                loc_pts = 25.0
                reasons_pos.append("100% 원격근무")
            else:
                loc_pts = 7.0
                reasons_neg.append("현장 출퇴근 필요")
        else:
            if any(w in job_loc for w in ("재택", "원격", "remote")):
                loc_pts = 22.0
            elif any(w in job_loc for w in ("멕시코", "해외", "베트남")):
                loc_pts = 6.0
                reasons_neg.append("해외 근무")
            else:
                loc_pts = 20.0

        # ── 3. Skills Overlap Score (0 ~ 20 pts) ──────────────────────────────
        required_skills = extract_required_skills_from_job(description + " " + title)
        required_skills_lower = {s.lower() for s in required_skills}
        matched = [s for s in candidate_skills if s.lower() in required_skills_lower or s.lower() in full_text]
        missing = [s for s in required_skills if s.lower() not in {c.lower() for c in candidate_skills}]

        if len(matched) >= 3:
            skill_score = 20.0
        elif len(matched) == 2:
            skill_score = 15.0
        elif len(matched) == 1:
            skill_score = 10.0
        else:
            skill_score = 4.0

        # ── 4. Experience & Education Score (0 ~ 10 pts) ──────────────────────
        job_level = _infer_job_level(title + " " + description)
        exp_score = min(6.0, _experience_score(candidate_level, candidate_years, job_level) * 0.24)
        edu_score = min(4.0, _education_score(candidate_education) * 0.26)
        exp_edu_total = round(exp_score + edu_score, 1)

        # ── 5. Platform Trust & Payout (0 ~ 10 pts) ───────────────────────────
        trust_info = get_platform_trust_info(job.get("company", ""), job.get("platform", ""), job.get("url", ""))
        trust_score = 10.0 if trust_info.get("rating") == "HIGH" else 6.0

        # Total score calculation
        total_score = round(role_pts + loc_pts + skill_score + exp_edu_total + trust_score, 1)
        total_score = max(15.0, min(96.0, total_score))

        # Clear, distinctive natural language match reason
        match_reason_parts: list[str] = []
        if reasons_pos:
            match_reason_parts.append(", ".join(reasons_pos[:2]) + " 일치")
        if reasons_neg:
            match_reason_parts.append("; ".join(reasons_neg[:2]))

        if not match_reason_parts:
            match_reason = f"전반적 역량 종합 적합도 {int(total_score)}%"
        else:
            match_reason = " · ".join(match_reason_parts)

        if job.get("is_curated"):
            match_reason = f"💡 AI 연관 역량 발굴: {match_reason}"
        elif job.get("is_expanded"):
            match_reason = f"💡 연관 직무 확장: {match_reason}"

        salary_type, salary_amount = _extract_salary_info(title + " " + description)
        contract_type = _extract_contract_type(title + " " + description)

        enriched.append(
            {
                **job,
                "match_score": total_score,
                "matched_skills": matched[:5],
                "missing_skills": missing[:5],
                "job_level_inferred": job_level,
                "contract_type": job.get("contract_type") or contract_type,
                "salary_type": job.get("salary_type") or salary_type,
                "salary_amount": job.get("salary_amount") or salary_amount,
                "trust_badge": trust_info.get("badge", "🟢 정식 채용"),
                "trust_rating": trust_info.get("rating", "HIGH"),
                "payment_methods": trust_info.get("payment_methods", ["통장 입금", "PayPal"]),
                "payment_cycle": trust_info.get("payment_cycle", "월급 / 주급"),
                "trust_summary": trust_info.get("summary", ""),
                "match_reason": match_reason,
                "score_breakdown": {
                    "skill_score": round(skill_score, 1),
                    "experience_score": round(exp_edu_total, 1),
                    "domain_score": round(role_pts, 1),
                    "education_score": round(loc_pts, 1),
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
