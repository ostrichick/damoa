"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ko";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    "nav.logo": "Damoa",
    "nav.subtitle": "AI Career Matching",
    "nav.step1": "Resume Input",
    "nav.step2": "AI Analysis",
    "nav.step3": "Job Matches",
    "nav.startBtn": "Get Started →",

    // Hero
    "hero.badge": "Gemini AI Intelligent Job Matching",
    "hero.titleLine1": "Discover Your Next Career Move",
    "hero.titleHighlight": "Tailored to Your Resume",
    "hero.desc": "Upload your resume or enter your profile. Our AI analyzes your skills, experiences, and preferences to discover matched opportunities from global and local job platforms in seconds.",
    "hero.uploadBtn": "Upload Resume",
    "hero.howItWorksBtn": "How It Works",

    // Stats
    "stats.accuracy": "98%",
    "stats.accuracyLabel": "Match Precision",
    "stats.jobs": "50,000+",
    "stats.jobsLabel": "Indexed Positions",
    "stats.time": "3 min",
    "stats.timeLabel": "Avg. Discovery Time",
    "stats.ai": "Gemini AI",
    "stats.aiLabel": "Personalized Insights",

    // How it works
    "how.title": "How It Works",
    "how.subtitle": "Three steps to intelligent job discovery",
    "how.step1.title": "Provide Resume",
    "how.step1.desc": "Upload PDF/DOCX or input text. Seamless support for tech, marketing, languages, and education profiles.",
    "how.step2.title": "Deep AI Extraction",
    "how.step2.desc": "Gemini extracts structured competencies, career milestones, certifications, and language proficiencies.",
    "how.step3.title": "Smart Multi-Platform Search",
    "how.step3.desc": "Parallel scanning across Wanted, Saramin, LinkedIn, and RemoteOK ranked by our 4-factor scoring engine.",

    // Features
    "feat.title": "Core Capabilities",
    "feat.f1.title": "Structured AI Parsing",
    "feat.f1.desc": "Automated skill decomposition, domain categorization, and career level classification.",
    "feat.f2.title": "Multi-Platform Crawling",
    "feat.f2.desc": "Concurrent query distribution across Korean local hiring platforms and global remote boards.",
    "feat.f3.title": "Platform Trust and Safety",
    "feat.f3.desc": "Verified reviews, payout security analysis (PayPal, direct wire), and reliability risk scores.",
    "feat.f4.title": "Natural Language Preferences",
    "feat.f4.desc": "Input free-form requirements (e.g. on-site in Jeonju, Spanish/English teaching, or remote AI QA) to tune rankings.",

    // CTA
    "cta.title": "Ready to Explore Opportunities?",
    "cta.desc": "Analyze your resume in seconds. No account required, 100% free.",
    "cta.btn": "Start Free Analysis →",

    // Upload page
    "upload.savedTitle": "Saved Candidate Profiles",
    "upload.savedDesc": "Previously analyzed resumes found. Select one to search immediately or upload/update.",
    "upload.newTitle": "Upload Your Resume",
    "upload.newDesc": "Select a PDF/DOCX file, paste plain text, or connect your profile",
    "upload.useThis": "⚡ Search With This Profile →",
    "upload.update": "🔄 Upload / Add Another Resume",
    "upload.useSavedBack": "← Back to Saved Profiles",
    "upload.tabFile": "📄 File Upload",
    "upload.tabText": "✏️ Paste Text",
    "upload.tabLinkedIn": "🔗 LinkedIn URL",
    "upload.dropText": "Drag and drop your resume here, or",
    "upload.dropBrowse": "browse file",
    "upload.dropHint": "Supports PDF and DOCX (Max 10MB)",
    "upload.textPlaceholder": "Paste your resume, CV, or LinkedIn summary here...",
    "upload.linkedinPlaceholder": "https://linkedin.com/in/username",
    "upload.analyzeBtn": "Analyze Resume with Gemini AI →",
    "upload.analyzing": "Analyzing resume profile with AI...",
    "upload.expYears": "Years Experience",
    "upload.skillsCount": "Skills Extracted",
    "upload.domains": "Domains",

    // Upload Preferences
    "pref.title": "💬 Work Conditions and Preferences (Natural Language)",
    "pref.desc": "Describe your desired role, salary requirements, location (e.g. Jeonju on-site, Seoul, or Global Remote), languages, or payout method. The AI factors this into every recommendation.",
    "pref.placeholder": "e.g. 'On-site English or Spanish teaching in Jeonju / Jeonbuk area, digital marketing, flexible hours' or 'Remote AI evaluator with PayPal payout'",
    "pref.location": "Target Location",
    "pref.locKorea": "🇰🇷 Korea (All)",
    "pref.locJeonju": "📍 Jeonju (전주)",
    "pref.locSeoul": "🏙️ Seoul (서울)",
    "pref.locRemote": "🌐 Global Remote",
    "pref.locWorldwide": "🌍 Worldwide",
    "pref.numResults": "Results Count",
    "pref.searchBtn": "Search Matching Jobs →",

    // Results Page
    "results.title": "Recommended Opportunities",
    "results.subtitle": "Ranked by 4-factor AI matching and platform reliability",
    "results.back": "← Search Again",
    "results.cardView": "🎴 Card View",
    "results.tableView": "📊 Table View",
    "results.sortMatch": "Match Score",
    "results.sortSalary": "Salary / Hourly",
    "results.filterAll": "All Levels",
    "results.colScore": "Match",
    "results.colCompany": "Company and Platform",
    "results.colTitle": "Job Title and Location",
    "results.colContract": "Contract",
    "results.colSalary": "Compensation",
    "results.colTrust": "Platform Trust and Payout",
    "results.colSkills": "Matched Skills",
    "results.colAction": "Action",
    "results.apply": "Apply ↗",
    "results.trustGuide": "🛡️ Platform Reliability and Payout Guide",
    "results.paymentMethods": "Payout Channels",
    "results.paymentCycle": "Payout Cycle",
    "results.empty": "No matching jobs found. Try broadening location or preferences.",

    // Footer
    "footer.text": "Damoa — Intelligent Multi-Platform Career Discovery · 2026",
  },
  ko: {
    // Nav
    "nav.logo": "다모아",
    "nav.subtitle": "AI 맞춤 채용 매칭",
    "nav.step1": "이력서 입력",
    "nav.step2": "AI 분석",
    "nav.step3": "공고 추천",
    "nav.startBtn": "지금 시작하기 →",

    // Hero
    "hero.badge": "Gemini AI 기반 스마트 채용 매칭",
    "hero.titleLine1": "당신의 이력서로",
    "hero.titleHighlight": "완벽한 직장",
    "hero.desc": "이력서를 업로드하거나 프로필을 입력하세요. AI가 당신의 역량을 분석해 국내외 채용 플랫폼의 수천 개 공고 중 가장 잘 맞는 일자리를 실시간으로 찾아드립니다.",
    "hero.uploadBtn": "이력서 업로드하기",
    "hero.howItWorksBtn": "작동 방식 보기",

    // Stats
    "stats.accuracy": "98%",
    "stats.accuracyLabel": "매칭 정확도",
    "stats.jobs": "50,000+",
    "stats.jobsLabel": "분석된 공고",
    "stats.time": "3분",
    "stats.timeLabel": "평균 분석 시간",
    "stats.ai": "Gemini AI",
    "stats.aiLabel": "맞춤 추천",

    // How it works
    "how.title": "어떻게 작동하나요?",
    "how.subtitle": "3단계로 완성되는 AI 채용 매칭",
    "how.step1.title": "이력서 입력",
    "how.step1.desc": "PDF/DOCX 파일을 업로드하거나 텍스트를 입력합니다. IT, 마케팅, 어학, 교육 등 모든 직군을 완벽하게 지원합니다.",
    "how.step2.title": "AI 정밀 분석",
    "how.step2.desc": "Gemini AI가 스킬, 경력, 학력, 언어 능력을 정밀하게 구조화하여 프로필을 생성합니다.",
    "how.step3.title": "다중 플랫폼 실시간 매칭",
    "how.step3.desc": "원티드, 사람인, 링크드인, 리모트OK의 최신 공고를 동시에 크롤링하여 4요소 점수로 추천합니다.",

    // Features
    "feat.title": "강력한 핵심 기능",
    "feat.f1.title": "이력서 자동 분석",
    "feat.f1.desc": "PDF, DOCX 이력서에서 역량과 직무 경험, 언어 구사력을 자동으로 추출합니다.",
    "feat.f2.title": "다중 플랫폼 크롤링",
    "feat.f2.desc": "원티드, 사람인 등 국내 주요 채용 사이트와 글로벌 원격 플랫폼을 실시간 병렬 수집합니다.",
    "feat.f3.title": "플랫폼 신뢰도 및 정산 검증",
    "feat.f3.desc": "플랫폼별 신뢰 등급, 급여 지급 수단(PayPal, 계좌이체 등) 및 정산 리스크를 함께 분석해 드립니다.",
    "feat.f4.title": "자연어 희망조건 맞춤형 검색",
    "feat.f4.desc": "전주/서울 오프라인 직무, 스페인어/영어 강사, 마케팅, 원격 AI 평가 등 원하는 조건을 자유롭게 입력하세요.",

    // CTA
    "cta.title": "지금 바로 시작하세요",
    "cta.desc": "무료로 이력서를 분석하고 맞춤 채용 공고를 받아보세요. 회원가입 없이 바로 사용할 수 있습니다.",
    "cta.btn": "무료로 시작하기 →",

    // Upload page
    "upload.savedTitle": "저장된 후보자 프로필",
    "upload.savedDesc": "이전에 분석된 이력서가 있습니다. 원하는 프로필을 선택하여 바로 검색하거나 새 이력서를 등록할 수 있습니다.",
    "upload.newTitle": "이력서를 입력해주세요",
    "upload.newDesc": "PDF/DOCX 파일, 텍스트 직접 입력, LinkedIn URL 중 편한 방법을 선택하세요",
    "upload.useThis": "⚡ 이 프로필로 바로 검색하기 →",
    "upload.update": "🔄 새 이력서 추가 / 갱신하기",
    "upload.useSavedBack": "← 저장된 이력서 목록으로",
    "upload.tabFile": "📄 파일 업로드",
    "upload.tabText": "✏️ 텍스트 입력",
    "upload.tabLinkedIn": "🔗 LinkedIn URL",
    "upload.dropText": "여기로 이력서 파일을 끌어다 놓거나",
    "upload.dropBrowse": "파일 선택하기",
    "upload.dropHint": "PDF 및 DOCX 지원 (최대 10MB)",
    "upload.textPlaceholder": "이력서 본문, 자기소개서, 경력 요약을 입력해주세요...",
    "upload.linkedinPlaceholder": "https://linkedin.com/in/사용자명",
    "upload.analyzeBtn": "Gemini AI로 이력서 분석하기 →",
    "upload.analyzing": "Gemini AI가 이력서를 분석하는 중...",
    "upload.expYears": "년 경력",
    "upload.skillsCount": "개 스킬 추출",
    "upload.domains": "전문 도메인",

    // Upload Preferences
    "pref.title": "💬 희망 근무 조건 및 요청사항 (자연어 자유 입력)",
    "pref.desc": "원하는 직무, 근무 형태(전주 오프라인, 서울, 원격), 언어(영어/스페인어), 급여 조건, 정산 수단 등을 자유롭게 적어보세요.",
    "pref.placeholder": "예: '전주/전북 지역 오프라인 영어 또는 스페인어 강사, 디지털 마케팅 직무' 또는 '한국어 모어화자 원격 AI 평가, 페이팔 정산'",
    "pref.location": "희망 근무지",
    "pref.locKorea": "🇰🇷 한국 전체 (Korea)",
    "pref.locJeonju": "📍 전주 (Jeonju)",
    "pref.locSeoul": "🏙️ 서울 (Seoul)",
    "pref.locRemote": "🌐 글로벌 원격 (Remote)",
    "pref.locWorldwide": "🌍 전 세계 (Worldwide)",
    "pref.numResults": "추천 결과 수",
    "pref.searchBtn": "맞춤 채용 공고 검색하기 →",

    // Results Page
    "results.title": "맞춤 추천 채용 공고",
    "results.subtitle": "AI 4단계 적합도 점수와 플랫폼 신뢰도 기반 랭킹",
    "results.back": "← 다시 검색하기",
    "results.cardView": "🎴 카드형",
    "results.tableView": "📊 테이블형",
    "results.sortMatch": "적합도순",
    "results.sortSalary": "급여순",
    "results.filterAll": "전체 경력",
    "results.colScore": "적합도",
    "results.colCompany": "회사 및 플랫폼",
    "results.colTitle": "채용 공고 및 근무지",
    "results.colContract": "고용형태",
    "results.colSalary": "급여 정보",
    "results.colTrust": "플랫폼 신뢰도 및 정산",
    "results.colSkills": "매칭된 스킬",
    "results.colAction": "지원",
    "results.apply": "지원하기 ↗",
    "results.trustGuide": "🛡️ 플랫폼 신뢰도 및 정산 방식 안내",
    "results.paymentMethods": "정산 수단",
    "results.paymentCycle": "정산 주기",
    "results.empty": "일치하는 공고가 없습니다. 희망 지역이나 조건을 넓혀서 다시 검색해 보세요.",

    // Footer
    "footer.text": "다모아 (Damoa) — AI 기반 스마트 다중 플랫폼 채용 추천 서비스 · 2026",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("damoa_lang") : null;
    if (saved === "ko" || saved === "en") {
      setLanguageState(saved as Language);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("damoa_lang", lang);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
