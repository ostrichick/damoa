/**
 * Job Tag & Field Translator
 * Automatically translates Korean job terms (contract types, salary notes,
 * trust badges, payment methods, locations) into English when language is 'en'.
 */

export const TAG_DICTIONARY: Record<string, string> = {
  // Contract Types
  "정규직": "Full-time",
  "계약직": "Contract",
  "프리랜서": "Freelance",
  "인턴": "Internship",
  "인턴직": "Internship",
  "아르바이트": "Part-time",
  "알바": "Part-time",
  "파견직": "Dispatched",
  "위촉직": "Commissioned",
  "위탁직": "Outsourced",
  "계속근로": "Permanent",

  // Salary & Compensation
  "회사내규에 따름": "Per company policy",
  "회사내규": "Company policy",
  "면접 후 결정": "Negotiable after interview",
  "면접후 결정": "Negotiable after interview",
  "면접 후 협의": "Negotiable after interview",
  "면접후 협의": "Negotiable after interview",
  "협의": "Negotiable",
  "추후 협의": "Negotiable later",
  "급여 협의": "Salary negotiable",
  "연봉": "Annual",
  "월급": "Monthly",
  "주급": "Weekly",
  "시급": "Hourly",
  "건별": "Per task",

  // Trust Badges & Safety
  "🟢 정식 채용 공고": "🟢 Official Job Listing",
  "🟢 공식 채용 공고": "🟢 Official Job Listing",
  "🟢 검증된 원격 플랫폼": "🟢 Verified Remote Platform",
  "🟢 검증된 플랫폼": "🟢 Verified Platform",
  "🟢 검증된 기업": "🟢 Verified Enterprise",
  "🟢 상장사 (검증됨)": "🟢 Public Enterprise (Verified)",
  "🟢 정식 기업 직채용": "🟢 Corporate Direct Hire",
  "🟢 에스크로 안전 보장": "🟢 Escrow Guaranteed",
  "🟡 주의 필요 (물량 변동)": "🟡 Review Recommended (Fluctuations)",
  "🟡 리뷰 확인 권장": "🟡 Review Recommended",
  "검증 완료": "Verified Listing",
  "공식 채용": "Official Listing",

  // Payment Methods
  "통장 직접 입금": "Direct Bank Transfer",
  "통장 입금": "Direct Bank Transfer",
  "은행 직통 입금": "Bank Deposit",
  "계좌이체": "Bank Transfer",
  "국내/해외 통장 직접 입금": "Direct Wire (Domestic/Global)",
  "국내/해외 송금": "Direct Wire Transfer",
  "SWIFT/IBAN 해외 은행 송금": "SWIFT/IBAN International Wire",
  "국내 은행 직통 입금 (Wire)": "Direct Wire Transfer (Local Bank)",
  "월급 / 계약서 기준": "Monthly / Per Contract",
  "매주 화요일 자동 정산": "Weekly Auto-Payout (Tuesdays)",
  "매월 1회 정기 송금": "Monthly Scheduled Wire",
  "매월 15일~25일 일괄 지불": "Monthly (15th-25th)",
  "작업 승인 후 3일 이내 (자유 출금)": "Within 3 days of approval",
  "매주 목요일 지급": "Weekly on Thursdays",
  "클라이언트 승인 후 즉시 출금 가능": "Instant withdrawal upon approval",
  "월급 (매월 지정일)": "Monthly (Scheduled date)",

  // Deadlines & Availability
  "채용시 마감": "Until filled",
  "상시채용": "Always open",
  "마감일": "Deadline",
  "오늘 마감": "Closes today",
  "내일 마감": "Closes tomorrow",

  // Locations (Common phrases in Saramin)
  "북·중미 멕시코": "Mexico / North America",
  "서울 송파구": "Songpa-gu, Seoul",
  "서울 강남구": "Gangnam-gu, Seoul",
  "경북 구미시": "Gumi-si, Gyeongbuk",
  "부산 해운대구": "Haeundae-gu, Busan",
  "전북 전주시": "Jeonju-si, Jeonbuk",
  "전북 전주": "Jeonju, Jeonbuk",
  "전북": "Jeonbuk",
  "전남": "Jeonnam",
  "충북": "Chungbuk",
  "충남": "Chungnam",
  "경북": "Gyeongbuk",
  "경남": "Gyeongnam",
  "강원": "Gangwon",
  "제주": "Jeju",
  "재택": "Remote / WFH",
  "재택근무": "Remote / WFH",
  "전국": "Nationwide",
};

export function translateTag(text: string | undefined | null, lang: "en" | "ko"): string {
  if (!text) return "";
  if (lang === "ko") return text;

  const trimmed = text.trim();
  if (TAG_DICTIONARY[trimmed]) {
    return TAG_DICTIONARY[trimmed];
  }

  let result = text;
  for (const [korean, english] of Object.entries(TAG_DICTIONARY)) {
    if (result.includes(korean)) {
      result = result.split(korean).join(english);
    }
  }

  result = result.replace(/([0-9,]+)\s*만원/g, "$10,000 KRW");
  result = result.replace(/([0-9,]+)\s*원/g, "$1 KRW");

  return result;
}

export function translateTags(list: string[] | undefined | null, lang: "en" | "ko"): string[] {
  if (!list || list.length === 0) return [];
  return list.map((item) => translateTag(item, lang));
}
