# Damoa (다모아) — 프로젝트 히스토리 및 개발 컨텍스트 마스터 문서
> **Note for AI Assistants (ChatGPT, Claude, etc.)**: 
> 이 문서는 본 프로젝트의 개발 배경, 사용자 특성, 지금까지의 모든 요구사항 및 코드 수정 이유(Why & How), 시스템 아키텍처를 총정리한 마스터 컨텍스트 파일입니다. 다른 AI 도구로 작업 환경을 옮기더라도 이 문서를 읽으면 프로젝트의 현재 상태와 히스토리를 100% 온전하게 파악할 수 있습니다.

---

## 1. 프로젝트 개요 및 핵심 타겟 사용자

- **서비스명**: **다모아 (Damoa)**
- **정의**: AI 기반 이력서 정밀 분석 및 다중 플랫폼(원티드, 사람인, LinkedIn, RemoteOK) 실시간 크롤링 맞춤 채용 추천 웹 애플리케이션
- **프로젝트 실사용자 (부부 맞춤형 시스템)**:
  1. **남편 (최문성 님)**:
     - **배경/역량**: 한국어 모어화자, 컴퓨터과학 및 한국어교육 전공, 음성 대화형 AI 평가/라벨링(Outlier 등) 경험 보유.
     - **구직 타겟**: 한국에 국한되지 않는 **글로벌 원격(Remote) AI 데이터 평가 / LLM 트레이너 / 대화형 AI QA** 포지션.
     - **중요 요구조건**: 플랫폼 신뢰도(돈을 떼먹거나 사기 위험이 없는지 검증) 및 대금 정산 방식(PayPal, 해외 계좌 송금 등) 안내 필수.
  2. **아내 (Nicole Mostacero Salinas 님)**:
     - **배경/역량**: 페루 출신, 스페인어 원어민(Native), 고급 영어(Advanced), 기초 한국어. 디지털 미디어 & 시각영상 커뮤니케이션 학사.
     - **주요 경력**: 메타 비즈니스 스위트 기반 소셜 미디어 마케팅, Canva 그래픽 디자인, 유튜브 채널 운영(YouTube SEO/분석), 의료 통역(Medical Interpreter).
     - **구직 타겟**: 대한민국 전북 전주시 거주 중으로, **한국 내 오프라인/현장(On-site) 직무 (전주, 서울, 한국 전체)** 중심 (스페인어/영어 강사, 글로벌 마케팅, 통번역, 콘텐츠 기획).

---

## 2. 사용자 요청 사항 및 수정 이력 (Changelog & Rationales)

지금까지 사용자가 직접 요청한 내용과, 각 요청을 해결하기 위해 어떤 수정을 왜(Why) 진행했는지 연대순으로 정리되어 있습니다.

### [Phase 1] UI 및 사용자 맞춤화 개선

#### 1. 결과 화면 뷰 모드 추가 (카드형 + 테이블형)
- **사용자 요청**: *"검색결과 인터페이스가 지금처럼 카드형식도 좋지만 테이블형식으로도 볼 수 있어서 회사 이름, 계약 형태, 시급/주급/월급/연봉여부, 얼마인지 한눈에 비교하기 쉬우면 좋을듯"*
- **수정 내용**:
  - `frontend/app/results/page.tsx`: 상단에 `[ 🎴 카드형 ]` / `[ 📊 테이블형 ]` 뷰 전환 스위처 구현.
  - `frontend/app/globals.css`: 블러 효과가 적용된 글래스 테이블 스타일(`.glass-table-container`, `.glass-table`) 추가.
  - `backend/services/matcher.py`: 공고 본문에서 고용 형태(정규직/계약직/프리랜서), 급여 주기(시급/월급/연봉), 금액을 정규식으로 추출하여 반환하도록 개선.

#### 2. 글로벌 원격 근무 및 플랫폼 신뢰도 & 정산 정보 탑재
- **사용자 요청**: 
  1. *"한국에 국한하지 말고 글로벌 AI 원격근무를 다양하게 추천해줘"*
  2. *"플랫폼이 믿을만한지, 돈을 떼먹지 않는지, 보수 지불은 어떻게 하는지(paypal, 통장입금 등) 알려줘"*
- **수정 내용**:
  - `backend/services/platform_trust.py` 신규 모듈 구축:
    - Outlier.ai, DataAnnotation.tech, OneForma, Appen, TELUS, RWS, Upwork, LinkedIn 등 주요 플랫폼 데이터베이스 구축.
    - 플랫폼별 신뢰도 등급(HIGH/MEDIUM/CAUTION), 사기 위험 평가, 정산 수단(PayPal, Payoneer, Wire), 지급 주기(주급/월급) 제공.
  - 프론트엔드 카드형 및 테이블형에서 신뢰도 뱃지 및 정산 가이드 표시.

#### 3. 자연어 근무조건 자유 입력창 (Custom Prompt) 추가
- **사용자 요청**: *"이력서 분석하고 공고 보기 전에 텍스트 박스를 넣어서 사용자가 원하는 근무조건이나 지역 등을 자연어로 설명할 수 있게 하고 그에 맞춰 추천해줘"*
- **수정 내용**:
  - `frontend/app/upload/page.tsx`: 이력서 분석 후 "💬 희망 근무 조건 및 요청사항 (자연어 자유 입력)" 텍스트 영역 추가.
  - `backend/services/matcher.py`: 사용자의 자연어 입력문(예: "페이팔 정산, 시급 $25 이상, 전주 지역")을 분석하여 매칭 점수에 추가 가산점(+15점 보너스)을 부여하는 `_custom_prompt_score` 엔진 탑재.

---

### [Phase 2] 크롤링 다각화 및 핵심 버그 수정

#### 4. 다중 플랫폼 병렬 크롤러 확장 (LinkedIn + Wanted + Saramin + RemoteOK)
- **사용자 요청**: *"채용 공고를 linkedin 말고 여러 일자리 플랫폼에서 크롤링해오면 속도가 많이 떨어질까? 여러 플랫폼에서 가져오게 해줘"*
- **수정 내용**:
  - 크롤러 모듈화:
    - `wanted_crawler.py`: 원티드(Wanted.co.kr) REST API 기반 고속 크롤러
    - `saramin_crawler.py`: 사람인(Saramin) 검색 결과 스크래퍼
    - `remoteok_crawler.py`: RemoteOK 글로벌 원격근무 API 크롤러
    - `linkedin_crawler.py`: 링크드인 공개 공고 크롤러
    - `multi_crawler.py`: `asyncio.gather`를 통해 4개 플랫폼을 동시 병렬 수집(1.5~2.5초 이내 완료) 및 중복 제거.

#### 5. "검색결과 0개" 버그 원인 분석 및 해결
- **사용자 요청**: *"이력서를 첨부하고 검색을 하면 왜 0개가 나와? 아무것도 적합한 게 없어?"*
- **근본 원인 분석 (3가지)**:
  1. `matcher.py`에서 `trust_info` 변수를 선언하기 전에 `_custom_prompt_score(..., trust_info)`로 참조하여 `UnboundLocalError` 발생 -> `jobs.py`에서 예외 처리로 빈 배열 반환.
  2. 검색 쿼리 빌더가 이력서의 모든 스킬을 공백으로 합쳐 8단어짜리 긴 문장("AI Data Annotation Conversation Evaluation Korean Language...")을 만들어 외부 API 검색 시 매칭 공고 0건 발생.
  3. `KNOWN_SKILLS`에 소프트웨어 개발자 언어만 있고 AI 데이터 평가/라벨링 키워드가 누락됨.
- **수정 내용**:
  - `UnboundLocalError` 순서 버그 수정.
  - `_build_search_query`를 개선하여 핵심 키워드(예: "Korean AI")로 압축 쿼리 생성.
  - `KNOWN_SKILLS`에 AI 데이터 평가, 언어, 전사, QA 관련 스킬 대거 보강.

#### 6. 이력서 영구 저장 및 원클릭 바이패스 (Persistent Resume)
- **사용자 요청**: *"매번 이력서를 새로 업로드 안 해도 한 번 업로드했으면 그 내용 바탕으로 검색할 수 있게 해줘 (원한다면 갱신 가능)"*
- **수정 내용**:
  - `backend/routers/resume.py`: 최신 이력서를 가져오는 `GET /api/resume/latest` 엔드포인트 구현.
  - `frontend/app/upload/page.tsx`: 접속 시 `localStorage` 및 백엔드 DB에서 기존 이력서를 확인하여 "저장된 내 이력서 발견" 카드를 최상단에 노출.
  - **`[⚡ 이 이력서로 바로 검색하기 →]`** 버튼 클릭 시 파일 재업로드와 AI 분석 대기 시간 없이 즉시 검색 화면으로 진입.
  - **`[🔄 새 이력서로 갱신하기]`** 버튼으로 원할 때 언제든 새로운 파일 업로드 가능.

---

### [Phase 3] 시스템 운영성 개선 및 클라우드 무료 배포

#### 7. "2 tasks running" 회전 및 질문 대기열 딜레이 문제 해결
- **사용자 요청**: *"여기에 2 tasks running이라고 떠있으면서 항상 빙글빙글 돌아가는건 왜그런거임? 이것때문에 내가 너한테 요청을 제때 못함 중지를 시켜줘야만 요청이 됨"*
- **원인 분석**:
  - AI 코딩 어시스턴트(Antigravity) 내부 터미널 도구로 `npm run dev`와 `uvicorn`을 백그라운드로 실행해 둠.
  - 상주 서버 특성상 태스크가 끝나지 않으므로, Antigravity IDE는 에이전트가 계속 작업 중인 것으로 판단하여 사용자 입력을 `Queued Messages`로 대기시킴.
- **수정 내용**:
  - Antigravity 내부 상주 태스크를 모두 종료(`kill`).
  - 외부에서 별도 창으로 띄울 수 있는 `start_damoa.bat`(원클릭 실행) 및 `stop_damoa.bat`(원클릭 종료) 스크립트 작성.

#### 8. 무료 호스팅(Vercel + Render) 24시간 클라우드 배포
- **사용자 요청**: *"로컬서버 말고 무료 호스팅서버에 올리면 내가 껐다켰다 안해도 알아서 되는거 아니야? 내 깃허브 계정으로 해줘"*
- **수정 내용**:
  - **보안 격리 (`.gitignore`)**: Gemini API 키가 담긴 `.env`, 개인 DB `damoa.db`, `venv/`, `node_modules/`가 GitHub에 올라가지 않도록 설정.
  - **백엔드 경량화 (`requirements.txt`)**: Render 무료 티어(512MB RAM) 빌드 타임아웃을 방지하기 위해 미사용 패키지(`sentence-transformers`, `scikit-learn` 등 1.5GB 상당) 제거.
  - **CORS 설정 (`main.py`)**: Vercel 배포 도메인을 수용할 수 있도록 CORS 개방.
  - **배포 주소**:
    - **Frontend (Vercel)**: 👉 [https://damoa-one.vercel.app](https://damoa-one.vercel.app) (무료, 24시간 상시 가동)
    - **Backend (Render)**: 👉 [https://damoa-backend.onrender.com](https://damoa-backend.onrender.com) (무료 Python Web Service)
    - **GitHub Repo**: [https://github.com/ostrichick/damoa](https://github.com/ostrichick/damoa) (Private)

---

### [Phase 4] 모던 디자인 개편, 다국어, 아내분 구직 지원

#### 9. 모던 흑백/그레이스케일(Monochrome) 테마 전면 개편
- **사용자 요청**: *"웹사이트 디자인이 지금꺼말고 조금 유명한 웹사이트 디자인 템플릿 리스트에서 회색 흑백 계열의 깔끔하고 전문적인 디자인이였으면 좋겠다."*
- **수정 내용**:
  - 기존 보라/시안 네온 그라데이션을 걷어내고, **Linear / Vercel / Apple Developer 스타일의 미니멀 흑백 Zinc 테마**로 전면 교체.
  - `globals.css`: 딥 징크(`zinc-950`) 캔버스, 1px 미세 테두리, 반투명 글래스(`zinc-900`), 고대비 솔리드 화이트 버튼(`#ffffff` / `#09090b`), 절제된 그레이스케일 뱃지 적용.

#### 10. 웹사이트 다국어(EN/KO) 지원 (기본 영어 + 한국어 영구 유지)
- **사용자 요청**: *"웹사이트 언어 설정은 한국어, 영어 두가지를 제공해줘. 기본값은 영어로 하되 한번 한국어로 설정하면 그 설정이 계속 유지되게 해줘."*
- **수정 내용**:
  - `frontend/app/context/LanguageContext.tsx` 구현:
    - 기본 언어: `en` (English)
    - 언어 변경 시 `localStorage.setItem('damoa_lang', lang)`에 영구 저장.
  - `frontend/app/components/Navbar.tsx`: 세련된 `[ EN | KO ]` 필 버튼 토글 탑재.
  - 랜딩 페이지, 업로드, 프로필 검토, 결과 테이블 전체에 동적 번역 사전 적용.

#### 11. 아내분(Nicole Salinas) 이력서 분석 및 한국 오프라인 구직 지원
- **사용자 요청**: *"내 아내도 아내 이력서 바탕으로 잡서칭을 하고싶은데 지금 이력서 바탕으로 한국에서 오프라인 직업을 알아보고 있어. 이 이력서를 읽어보고 아내도 내 웹서비스에서 도움을 받을 수 있게 변경해줘."*
- **수정 내용**:
  - **스킬 및 도메인 사전 확장 (`matcher.py`)**:
    - 마케팅/SNS: `Digital Marketing`, `Social Media Management`, `Content Creation`, `Meta Business Suite`, `Canva`, `YouTube SEO`, `Audiovisual Communications`
    - 통번역: `Medical Interpreter`, `Healthcare Interpretation`, `Spanish Interpretation`, `Translation`
    - 교육/강사: `English Teaching`, `Spanish Teaching`, `Language Instructor`, `ESL`, `Tutoring`
  - **지능형 한국 오프라인 검색 쿼리 (`jobs.py`)**:
    - 아내분의 스킬을 감지하여 원티드/사람인/링크드인에서 `스페인어 통역`, `영어 강사`, `콘텐츠 마케팅` 등의 한국 내 실제 공고를 수집하도록 쿼리 생성 최적화.
  - **오프라인 근무지 프리셋 추가**:
    - `🇰🇷 한국 전체 (Korea)`, `📍 전주 (Jeonju)`, `🏙️ 서울 (Seoul)`, `🌐 글로벌 원격 (Remote)` 빠른 선택 칩 제공.
  - **부부 다중 프로필 관리 (`upload/page.tsx`)**:
    - 남편(최문성 님)과 아내(Nicole Salinas 님)의 이력서를 브라우저에 모두 기억하여, 각자의 카드를 클릭해 1초 만에 전환하며 구직할 수 있는 다중 프로필 시스템 탑재.

---

## 3. 기술 스택 및 주요 파일 구조

```
Damoa/
├── backend/
│   ├── main.py                     # FastAPI 앱 진입점, CORS, 헬스체크
│   ├── database.py                 # SQLite (aiosqlite) 스키마 및 비동기 커넥션
│   ├── requirements.txt            # Render 무료 티어 맞춤 경량화 의존성
│   ├── render.yaml                 # Render 클라우드 빌드/시작 사양
│   ├── routers/
│   │   ├── resume.py               # 이력서 업로드/파싱/최신조회 API
│   │   └── jobs.py                 # 지능형 쿼리 빌더, 검색/매칭 API
│   └── services/
│       ├── ai_analyzer.py          # Gemini AI 이력서 구조화 분석
│       ├── matcher.py              # 4단계 적합도 엔진 + 자연어 보너스 점수 + 스킬사전
│       ├── platform_trust.py       # 플랫폼별 신뢰도 등급 & 정산 채널 DB
│       └── crawlers/
│           ├── wanted_crawler.py   # 원티드(Wanted) API 크롤러
│           ├── saramin_crawler.py  # 사람인(Saramin) 웹 스크래퍼
│           ├── remoteok_crawler.py # RemoteOK 글로벌 원격 API 크롤러
│           ├── linkedin_crawler.py # LinkedIn 크롤러
│           └── multi_crawler.py    # 4개 플랫폼 병렬 오케스트레이터
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # RootLayout, LanguageProvider 주입
│   │   ├── globals.css             # 모던 흑백 미니멀 디자인 시스템 (Linear/Vercel)
│   │   ├── page.tsx                # 랜딩 페이지 (히어로, 통계, 기능, CTA)
│   │   ├── upload/page.tsx         # 업로드 & 부부 다중 프로필 선택 & 자연어 조건 입력
│   │   ├── results/page.tsx        # 추천 결과 (카드형/테이블형, 필터, 신뢰도가이드)
│   │   ├── components/Navbar.tsx   # 로고, 단계 인디케이터, EN/KO 언어 토글
│   │   └── context/LanguageContext.tsx # 영구 저장 다국어(EN/KO) 프로바이더
│   └── vercel.json                 # Vercel Next.js 배포 설정
│
├── start_damoa.bat                 # 로컬 독립 실행 스크립트
├── stop_damoa.bat                  # 로컬 독립 종료 스크립트
├── PROJECT_HISTORY.md              # [현재 문서] 전체 프로젝트 히스토리 마스터 문서
└── .gitignore                      # 보안 파일 및 무거운 폴더 격리
```

---

## 4. 차후 AI 작업자를 위한 가이드 (ChatGPT, Claude 전달 시)

1. **새로운 기능을 추가할 때**:
   - `frontend/app/context/LanguageContext.tsx`에 신규 텍스트의 `en` 및 `ko` 번역을 반드시 함께 추가하세요.
   - 디자인은 화려한 색상 대신 `globals.css`의 흑백 모노크롬(`zinc-950`, `zinc-100`, 1px borders)을 유지하세요.
2. **배포 시 주의사항**:
   - 코드를 수정한 후 `git add .`, `git commit -m "..."`, `git push origin main`을 실행하면 Vercel(프론트엔드)과 Render(백엔드)가 자동으로 감지하여 1~2분 내에 최신 버전으로 배포됩니다.
   - Render 무료 티어의 512MB RAM 한계를 넘지 않도록 `requirements.txt`에 무거운 딥러닝 패키지(PyTorch, Transformers 등)를 함부로 추가하지 마세요.
