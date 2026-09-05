# 다모아 (Damoa) 🎯
### AI 이력서 기반 채용 공고 추천 시스템

> 이력서를 업로드하거나 LinkedIn 프로필을 연결하면, Gemini AI가 역량을 분석하고 LinkedIn Jobs에서 최적의 채용 공고를 찾아드립니다.

---

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+
- Python 3.11+
- pip

### 1. 백엔드 실행

```bash
cd backend

# 가상환경 생성
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate   # Mac/Linux

# 패키지 설치
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install chromium

# 환경변수 설정
copy .env.example .env
# .env 파일을 열고 GEMINI_API_KEY 등 설정

# 서버 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 3. 브라우저 접속
- **프론트엔드**: http://localhost:3000
- **API 문서**: http://localhost:8000/docs

---

## 📋 환경변수 설정 (backend/.env)

```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite:///./damoa.db
SECRET_KEY=your_secret_key_here
CORS_ORIGINS=http://localhost:3000
```

### Gemini API 키 발급
1. https://aistudio.google.com 접속
2. "Get API Key" → "Create API Key"
3. 발급된 키를 `GEMINI_API_KEY`에 입력

---

## 🏗️ 프로젝트 구조

```
Damoa/
├── frontend/               # Next.js 16 + TypeScript + Tailwind
│   ├── app/
│   │   ├── page.tsx        # 랜딩 페이지
│   │   ├── upload/         # 이력서 업로드/분석 페이지
│   │   └── results/        # 채용 공고 추천 결과 페이지
│   └── ...
│
└── backend/                # Python FastAPI
    ├── main.py             # FastAPI 앱 진입점
    ├── database.py         # SQLite 데이터베이스
    ├── routers/
    │   ├── resume.py       # 이력서 API
    │   └── jobs.py         # 채용 공고 API
    └── services/
        ├── resume_parser.py    # PDF/DOCX 파싱
        ├── ai_analyzer.py      # Gemini AI 분석
        ├── matcher.py          # 적합도 계산
        └── crawlers/
            └── linkedin_crawler.py  # LinkedIn Jobs 크롤러
```

---

## ⚙️ 주요 기능

| 기능 | 설명 |
|------|------|
| 📄 이력서 파싱 | PDF, DOCX 파일에서 텍스트 추출 |
| 🤖 AI 분석 | Gemini 1.5 Pro로 스킬/경력/학력 구조화 |
| 🕷️ 채용 공고 크롤링 | LinkedIn Jobs 실시간 수집 (Playwright) |
| 🎯 적합도 매칭 | 스킬(40%) + 경력(25%) + 도메인(20%) + 학력(15%) |
| 💾 이력 저장 | SQLite에 분석 결과 및 추천 이력 저장 |

---

## ⚠️ 주의사항

- LinkedIn Jobs 크롤링은 bot 방지 정책으로 인해 간헐적으로 차단될 수 있습니다.
- Gemini API는 무료 티어에서 분당 요청 제한이 있습니다.
- 본 서비스는 교육/연구 목적으로만 사용하세요.

---

## 📄 라이선스

MIT License
