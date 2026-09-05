/**
 * Structured Pipeline Error Parser
 * Parses API error messages, HTTP status codes, and exceptions into
 * user-friendly, step-specific diagnostic cards.
 */

export interface ParsedPipelineError {
  stepCode: "STEP 1" | "STEP 2" | "STEP 3" | "STEP 4" | "SYSTEM";
  stepName: string;
  title: string;
  description: string;
  suggestedAction: string;
  raw?: string;
}

export function parsePipelineError(rawError: unknown, lang: "en" | "ko" = "en"): ParsedPipelineError {
  let rawMsg = "";

  if (typeof rawError === "string") {
    rawMsg = rawError;
  } else if (rawError instanceof Error) {
    rawMsg = rawError.message;
  } else if (rawError && typeof rawError === "object") {
    try {
      rawMsg = JSON.stringify(rawError);
    } catch {
      rawMsg = String(rawError);
    }
  }

  // Try extracting JSON detail if backend returned { "detail": "..." }
  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed.detail) {
      rawMsg = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
    }
  } catch {
    // raw string is fine
  }

  const isKo = lang === "ko";
  const lower = rawMsg.toLowerCase();

  // 1. Step 1: File Upload / Parsing / Format / Size
  if (
    lower.includes("step 1") ||
    lower.includes("1단계") ||
    lower.includes("pdf") ||
    lower.includes("docx") ||
    lower.includes("file too large") ||
    lower.includes("unsupported media") ||
    lower.includes("corrupted") ||
    lower.includes("text could be extracted") ||
    lower.includes("용량") ||
    lower.includes("형식")
  ) {
    return {
      stepCode: "STEP 1",
      stepName: isKo ? "1단계: 이력서 파일 전송 및 텍스트 추출" : "Step 1: File Upload & Text Extraction",
      title: isKo ? "이력서 파일 읽기 실패" : "Resume Document Parsing Failed",
      description: isKo
        ? "업로드한 파일(PDF/DOCX)에서 텍스트를 읽는 과정에서 오류가 발생했습니다."
        : "Failed to extract readable text content from the uploaded resume file.",
      suggestedAction: isKo
        ? "스캔 이미지 전용 PDF가 아닌 텍스트 복사가 가능한 PDF/DOCX 파일인지 확인하거나, 10MB 이하 파일로 다시 시도해주세요."
        : "Ensure the file contains selectable text (not a scanned image) under 10MB, or use the 'Paste Text' tab directly.",
      raw: rawMsg,
    };
  }

  // 2. Step 2: Gemini AI Analysis / API Key
  if (
    lower.includes("step 2") ||
    lower.includes("2단계") ||
    lower.includes("gemini") ||
    lower.includes("api key") ||
    lower.includes("api_key") ||
    lower.includes("ai analysis") ||
    lower.includes("profile analysis unavailable") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  ) {
    const isMissingKey = lower.includes("api key") || lower.includes("api_key") || lower.includes("not configured");
    return {
      stepCode: "STEP 2",
      stepName: isKo ? "2단계: Gemini AI 이력서 역량 정밀 분석" : "Step 2: Gemini AI Competency Analysis",
      title: isMissingKey
        ? (isKo ? "Gemini API 키 미등록 또는 설정 오류" : "Gemini API Key Missing / Unrecognized")
        : (isKo ? "Gemini AI 모델 통신 오류" : "Gemini AI Service Error"),
      description: isMissingKey
        ? (isKo
            ? "Render 서버 환경 변수에 GEMINI_API_KEY가 등록되지 않았거나 올바르게 연결되지 않았습니다."
            : "The GEMINI_API_KEY environment variable is not properly set on the Render backend container.")
        : (isKo
            ? "Google Gemini AI 모델 호출 중 응답 지연, 할당량(Quota) 초과 또는 일시적 네트워크 장애가 발생했습니다."
            : "Gemini AI model encountered a rate limit, quota exhaustion, or response timeout."),
      suggestedAction: isMissingKey
        ? (isKo
            ? "Render 대시보드 > Environment Variables에서 Key: GEMINI_API_KEY, Value: [내 API 키]로 올바르게 설정되어 있는지 확인하세요."
            : "Open Render Dashboard > Environment Variables and ensure Key is 'GEMINI_API_KEY' with your valid Google AI Studio key.")
        : (isKo
            ? "잠시 후(약 30초 뒤) 다시 시도하거나, Google AI Studio에서 API 키의 사용 한도(Quota)를 확인해주세요."
            : "Please wait 30 seconds and retry, or check your Google AI Studio quota limits."),
      raw: rawMsg,
    };
  }

  // 3. Step 3: Job Crawling (Wanted, Saramin, RemoteOK, LinkedIn)
  if (
    lower.includes("step 3") ||
    lower.includes("3단계") ||
    lower.includes("crawler") ||
    lower.includes("crawl") ||
    lower.includes("wanted") ||
    lower.includes("saramin") ||
    lower.includes("remoteok") ||
    lower.includes("linkedin") ||
    lower.includes("collecting job")
  ) {
    return {
      stepCode: "STEP 3",
      stepName: isKo ? "3단계: 다중 채용 플랫폼 실시간 크롤링" : "Step 3: Multi-Platform Job Crawling",
      title: isKo ? "채용 플랫폼 수집 지연 또는 통신 장애" : "Job Platform Crawling Timed Out",
      description: isKo
        ? "사람인, 원티드, RemoteOK 등 외부 채용 플랫폼에서 최신 공고를 수집하는 중 일시적인 지연이나 차단이 발생했습니다."
        : "External job platforms (Saramin, Wanted, RemoteOK) experienced a transient timeout or rate limiting.",
      suggestedAction: isKo
        ? "검색 지역이나 희망 직무 키워드를 좀 더 넓게 지정하고 다시 검색해 보세요."
        : "Try broadening your target location or prompt conditions, then run the search again.",
      raw: rawMsg,
    };
  }

  // 4. Step 4: Matching Engine
  if (
    lower.includes("step 4") ||
    lower.includes("4단계") ||
    lower.includes("matcher") ||
    lower.includes("match score") ||
    lower.includes("적합도")
  ) {
    return {
      stepCode: "STEP 4",
      stepName: isKo ? "4단계: AI 4요소 적합도 점수 계산" : "Step 4: 4-Factor AI Matching Engine",
      title: isKo ? "공고 적합도 계산 오류" : "Match Score Calculation Error",
      description: isKo
        ? "이력서 역량과 수집된 공고 간의 스킬/경력/도메인 적합도 점수 산출 중 데이터 불일치가 발생했습니다."
        : "Encountered unexpected data while matching candidate competencies against job descriptions.",
      suggestedAction: isKo
        ? "이력서 분석을 다시 실행하거나, 다른 프로필 카드로 검색을 시도해주세요."
        : "Re-run resume analysis or try searching with an alternative profile.",
      raw: rawMsg,
    };
  }

  // 5. Backend Server Connection / Network
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("connection refused") ||
    lower.includes("502") ||
    lower.includes("504") ||
    lower.includes("500") ||
    lower.includes("timeout")
  ) {
    return {
      stepCode: "SYSTEM",
      stepName: isKo ? "백엔드 서버 통신 장애" : "Backend Service Unavailable",
      title: isKo ? "Render 백엔드 서버 응답 지연 (콜드 스타트)" : "Render Backend Cold-Start or Network Timeout",
      description: isKo
        ? "Render 무료 티어는 일정 시간 요청이 없으면 슬립(Sleep) 상태로 전환됩니다. 첫 요청 시 서버가 깨어나는 데 약 40~50초가 걸릴 수 있습니다."
        : "Render free instances sleep after inactivity. The backend container may be cold-starting (takes ~45s on first wake-up).",
      suggestedAction: isKo
        ? "약 30초 후 다시 시도해보시거나, https://damoa-backend.onrender.com/ 에 접속하여 서버가 깨어났는지 확인해주세요."
        : "Wait ~30s and retry, or ping https://damoa-backend.onrender.com/ to wake the container.",
      raw: rawMsg,
    };
  }

  // Default fallback
  return {
    stepCode: "SYSTEM",
    stepName: isKo ? "시스템 안내" : "System Notification",
    title: isKo ? "작업 처리 중 알림" : "Operation Failed",
    description: rawMsg || (isKo ? "요청을 처리하는 중 예기치 않은 오류가 발생했습니다." : "An unexpected error occurred."),
    suggestedAction: isKo
      ? "페이지를 새로고침하거나 잠시 후 다시 시도해 주세요."
      : "Please refresh the page and try again.",
    raw: rawMsg,
  };
}
