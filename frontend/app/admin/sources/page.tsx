"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";

interface CrawlerSource {
  id: string;
  name: string;
  tier: "Tier 1 (High Priority)" | "Tier 2 (Secondary / Deep)" | "Specialized DB";
  tierColor: string;
  type: "Official REST API" | "HTML Scraper" | "JSON API" | "Headless Scraper" | "Verified DB";
  targetUser: "Wife (Nicole)" | "Husband (Munseong)" | "Both (Universal)";
  primaryTarget: string;
  targetLocations: string;
  latency: string;
  status: "ACTIVE" | "VERIFIED" | "FALLBACK";
  url: string;
  payoutMethods: string[];
  description: string;
  queryExample: string;
}

const CRAWLER_SOURCES: CrawlerSource[] = [
  {
    id: "saramin",
    name: "사람인 (Saramin)",
    tier: "Tier 1 (High Priority)",
    tierColor: "#ffffff",
    type: "HTML Scraper",
    targetUser: "Wife (Nicole)",
    primaryTarget: "한국 내 오프라인 직무, 스페인어/영어 통역, 학원 강사, 기업 마케팅",
    targetLocations: "전주 (Jeonju), 서울 (Seoul), 한국 전국",
    latency: "~1.1s",
    status: "ACTIVE",
    url: "https://www.saramin.co.kr",
    payoutMethods: ["통장 직접 입금", "4대 보험", "월급/계약서 기준"],
    description: "국내 최대 채용 포털. 아내 Nicole 님의 한국 현장 직무(전주/서울 스페인어 통역, 영어 강사 등) 수집의 1순위 핵심 엔진입니다.",
    queryExample: "'스페인어 통역', '영어 강사', '콘텐츠 마케팅'",
  },
  {
    id: "wanted",
    name: "원티드 (Wanted)",
    tier: "Tier 1 (High Priority)",
    tierColor: "#ffffff",
    type: "Official REST API",
    targetUser: "Both (Universal)",
    primaryTarget: "국내외 테크, 글로벌 마케팅, 다국어 콘텐츠, AI 엔지니어링",
    targetLocations: "서울, 판교, 한국 재택 / 하이브리드",
    latency: "~0.4s",
    status: "ACTIVE",
    url: "https://www.wanted.co.kr",
    payoutMethods: ["통장 직접 입금", "연봉/월급", "정식 기업 계약"],
    description: "원티드 공식 REST API를 직접 연동하여 0.4초 만에 고품질 채용 공고를 병렬 수집합니다.",
    queryExample: "'Global Marketing', 'AI Evaluation', 'Spanish Specialist'",
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    tier: "Tier 1 (High Priority)",
    tierColor: "#ffffff",
    type: "JSON API",
    targetUser: "Husband (Munseong)",
    primaryTarget: "100% 글로벌 재택근무, AI 데이터 평가, QA, 원격 소프트웨어",
    targetLocations: "100% Worldwide Remote (전 세계 어디서나)",
    latency: "~0.6s",
    status: "ACTIVE",
    url: "https://remoteok.com",
    payoutMethods: ["PayPal", "Stripe", "Wise", "Deel (USD 송금)"],
    description: "글로벌 1위 원격근무 잡보드. 남편 최문성 님의 글로벌 AI 평가 / LLM QA 원격 직무 발굴의 주력 소스입니다.",
    queryExample: "'AI Evaluator', 'QA', 'Data Annotation', 'Remote'",
  },
  {
    id: "linkedin",
    name: "LinkedIn Jobs (링크드인)",
    tier: "Tier 2 (Secondary / Deep)",
    tierColor: "#a1a1aa",
    type: "Headless Scraper",
    targetUser: "Both (Universal)",
    primaryTarget: "주한 다국적 기업, 글로벌 의료 통역(Medical Interpreter), 원격 AI",
    targetLocations: "한국 전역 및 글로벌 원격",
    latency: "~2.2s",
    status: "ACTIVE",
    url: "https://www.linkedin.com/jobs",
    payoutMethods: ["국내/해외 통장 입금", "Deel", "Wise", "기업 직채용"],
    description: "전 세계 최대 비즈니스 네트워크. 공식 게스트 엔드포인트와 스텔스 헤더를 적용하여 다국적 기업 공고를 심층 탐색합니다.",
    queryExample: "'Medical Interpreter Spanish', 'Korean AI Trainer'",
  },
  {
    id: "outlier",
    name: "Outlier.ai (Scale AI)",
    tier: "Specialized DB",
    tierColor: "#71717a",
    type: "Verified DB",
    targetUser: "Husband (Munseong)",
    primaryTarget: "한국어 LLM 평가, 프롬프트 엔지니어링, AI 데이터 트레이닝",
    targetLocations: "100% Remote",
    latency: "즉시 매칭 (Instant)",
    status: "VERIFIED",
    url: "https://outlier.ai",
    payoutMethods: ["PayPal", "AirTM (매주 화요일 자동 지급)"],
    description: "Scale AI의 자회사. 한국어 모어화자 AI 응답 평가 및 프롬프트 검수 프로젝트를 제공하며 매주 페이팔로 정시 정산됩니다.",
    queryExample: "Korean Conversational AI Evaluator / Trainer",
  },
  {
    id: "dataannotation",
    name: "DataAnnotation.tech",
    tier: "Specialized DB",
    tierColor: "#71717a",
    type: "Verified DB",
    targetUser: "Husband (Munseong)",
    primaryTarget: "고시급 AI 챗봇 평가 및 데이터 라벨링 ($20 ~ $40 / 시간)",
    targetLocations: "100% Remote",
    latency: "즉시 매칭 (Instant)",
    status: "VERIFIED",
    url: "https://www.dataannotation.tech",
    payoutMethods: ["PayPal (작업 승인 후 3일 이내 자유 출금)"],
    description: "시급 $20~$40대의 최고 수준 보수를 제공하는 AI 학습 평가 플랫폼으로, 페이팔을 통한 신속한 인출이 검증되어 있습니다.",
    queryExample: "Core AI Trainer / Bilingual Evaluator",
  },
  {
    id: "oneforma",
    name: "OneForma (Centific)",
    tier: "Specialized DB",
    tierColor: "#71717a",
    type: "Verified DB",
    targetUser: "Both (Universal)",
    primaryTarget: "다국어 음성 수집, AI 번역 검수, LLM 데이터 라벨링",
    targetLocations: "100% Remote",
    latency: "즉시 매칭 (Instant)",
    status: "VERIFIED",
    url: "https://www.oneforma.com",
    payoutMethods: ["Payoneer", "PayPal (매월 정기 지급)"],
    description: "글로벌 AI 데이터 전문 기업 Centific 운영. 한국어 및 스페인어 언어 프로젝트가 지속적으로 열립니다.",
    queryExample: "Spanish-English / Korean Translation & Audio Evaluation",
  },
  {
    id: "telus_appen",
    name: "TELUS & Appen (글로벌 상장사)",
    tier: "Specialized DB",
    tierColor: "#71717a",
    type: "Verified DB",
    targetUser: "Husband (Munseong)",
    primaryTarget: "검색 품질 평가사 (Search Quality Rater), AI 언어 평가",
    targetLocations: "Remote (Korea / Global)",
    latency: "즉시 매칭 (Instant)",
    status: "VERIFIED",
    url: "https://www.telusinternational.com",
    payoutMethods: ["국내 은행 직통 입금 (Wire)", "Hyperwallet", "Payoneer"],
    description: "글로벌 증시 상장 대기업으로 대금 미지급 위험이 0%이며 국내 시중은행 통장으로 직접 외화/원화가 입금됩니다.",
    queryExample: "Personalized Internet Assessor / Language QA",
  },
];

export default function CrawlerSourcesPage() {
  const { language, t } = useLanguage();
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://damoa-backend.onrender.com";

  const runDiagnostics = async () => {
    setPingLoading(true);
    setPingStatus("Checking backend and active crawler workers...");
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPingStatus(`🟢 Backend Online (v${data.version || "1.0"}) | Gemini AI: ${data.gemini_configured ? "Active (Configured)" : "Needs Key"} | Ready for crawls`);
      } else {
        setPingStatus(`🟡 Backend returned HTTP ${res.status}`);
      }
    } catch (e: any) {
      setPingStatus(`⚠️ Backend ping failed: ${e.message || "Network timeout"}`);
    } finally {
      setPingLoading(false);
    }
  };

  const filteredSources = CRAWLER_SOURCES.filter((s) => {
    if (filterUser === "wife" && s.targetUser !== "Wife (Nicole)" && s.targetUser !== "Both (Universal)") return false;
    if (filterUser === "husband" && s.targetUser !== "Husband (Munseong)" && s.targetUser !== "Both (Universal)") return false;
    if (filterTier === "tier1" && !s.tier.includes("Tier 1")) return false;
    if (filterTier === "tier2" && !s.tier.includes("Tier 2")) return false;
    if (filterTier === "db" && !s.tier.includes("Specialized")) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header Breadcrumbs & Admin Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
              ← {language === "ko" ? "홈으로" : "Back Home"}
            </Link>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
              background: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.15)",
              letterSpacing: "0.05em"
            }}>
              ⚙️ {language === "ko" ? "관리자 대시보드" : "ADMIN MONITOR"}
            </span>
          </div>

          <button
            onClick={runDiagnostics}
            disabled={pingLoading}
            className="btn-primary"
            style={{ padding: "7px 16px", fontSize: 12 }}
          >
            {pingLoading ? "⚡ Testing..." : language === "ko" ? "⚡ 실시간 크롤러/서버 진단" : "⚡ Run Live Diagnostics"}
          </button>
        </div>

        {/* Diagnostic Banner if run */}
        {pingStatus && (
          <div style={{
            padding: "12px 18px", borderRadius: 8, marginBottom: 24,
            background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.12)",
            fontSize: 13, color: "#e4e4e7"
          }}>
            {pingStatus}
          </div>
        )}

        {/* Main Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.02em" }}>
            {language === "ko" ? "크롤러 소스 및 우선순위 모니터" : "Crawler Sources & Priority Engine"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6, maxWidth: 800, lineHeight: 1.6 }}>
            {language === "ko"
              ? "다모아(Damoa)가 실시간으로 공고를 수집하는 국내외 채용 사이트 목록과 우선순위(Tier), 수집 방식 및 타겟 사용자별 라우팅 규칙입니다."
              : "Comprehensive architecture and priorities of all platforms searched by Damoa, organized by multi-platform crawling tiers, latency, and target profiles."}
          </p>
        </div>

        {/* Dual Target Strategy Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 32 }}>
          {/* Nicole's Strategy */}
          <div className="glass-card" style={{ padding: 22, border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fafafa" }}>
                👩 아내 (Nicole Mostacero Salinas) 맞춤 라우터
              </span>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>
                한국 현장 / 어학 / 마케팅
              </span>
            </div>
            <ul style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              <li><strong>1순위 크롤러</strong>: 사람인 (Saramin) — 전주 오프라인, 서울, 전국 현장직</li>
              <li><strong>2순위 크롤러</strong>: 원티드 (Wanted) — 글로벌 마케팅, 다국어 콘텐츠, Canva 디자인</li>
              <li><strong>3순위 크롤러</strong>: LinkedIn — 주한 다국적 기업 스페인어/의료 통역사</li>
              <li><strong>검증 정산 수단</strong>: 국내 4대보험 정규직/계약직, 통장 직접 입금</li>
            </ul>
          </div>

          {/* Munseong's Strategy */}
          <div className="glass-card" style={{ padding: 22, border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fafafa" }}>
                👨 남편 (최문성 님) 맞춤 라우터
              </span>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>
                글로벌 원격 / AI 평가 / LLM
              </span>
            </div>
            <ul style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              <li><strong>1순위 크롤러</strong>: RemoteOK — 100% 글로벌 재택근무, AI 데이터 평가</li>
              <li><strong>2순위 크롤러</strong>: LinkedIn Remote — 전 세계 원격 LLM QA / AI 트레이너</li>
              <li><strong>특화 매칭 DB</strong>: Outlier.ai, DataAnnotation ($20~$40/hr), OneForma</li>
              <li><strong>검증 정산 수단</strong>: PayPal, AirTM (매주 화요일 지급), 해외 전신환 송금</li>
            </ul>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            {language === "ko" ? "필터링:" : "Filters:"}
          </span>

          <select
            className="input-field"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={{ padding: "6px 12px", fontSize: 12, width: "auto" }}
          >
            <option value="all">{language === "ko" ? "모든 대상 사용자" : "All Target Users"}</option>
            <option value="wife">{language === "ko" ? "아내 (Nicole) 우선 소스" : "Wife (Nicole) Sources"}</option>
            <option value="husband">{language === "ko" ? "남편 (최문성) 우선 소스" : "Husband (Munseong) Sources"}</option>
          </select>

          <select
            className="input-field"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            style={{ padding: "6px 12px", fontSize: 12, width: "auto" }}
          >
            <option value="all">{language === "ko" ? "모든 우선순위 (All Tiers)" : "All Tiers"}</option>
            <option value="tier1">Tier 1 (High Priority)</option>
            <option value="tier2">Tier 2 (Secondary / Deep)</option>
            <option value="db">Specialized Platform DB</option>
          </select>

          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            {filteredSources.length} {language === "ko" ? "개 플랫폼 활성화" : "Platforms Active"}
          </span>
        </div>

        {/* Sources Cards Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredSources.map((src) => (
            <div
              key={src.id}
              className="glass-card"
              style={{ padding: 22, border: "1px solid rgba(255, 255, 255, 0.08)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: "rgba(255,255,255,0.08)", color: src.tierColor,
                      border: "1px solid rgba(255,255,255,0.15)"
                    }}>
                      {src.tier}
                    </span>
                    <span style={{
                      fontSize: 10, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(255,255,255,0.04)", color: "#a1a1aa", textTransform: "uppercase"
                    }}>
                      {src.type}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      ⚡ {src.latency}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", display: "flex", alignItems: "center", gap: 8 }}>
                    {src.name}
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "#a1a1aa", textDecoration: "underline", fontWeight: 400 }}
                    >
                      {src.url.replace("https://", "")} ↗
                    </a>
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                    {src.description}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{
                    display: "inline-block", fontSize: 11, padding: "3px 8px", borderRadius: 12,
                    background: "rgba(34, 197, 94, 0.12)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.25)",
                    fontWeight: 600
                  }}>
                    ● {src.status}
                  </span>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    타겟: <strong style={{ color: "#e4e4e7" }}>{src.targetUser}</strong>
                  </div>
                </div>
              </div>

              {/* Details breakdown */}
              <div style={{
                marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: 12
              }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>🎯 주요 수집 직무:</span>
                  <div style={{ color: "#e4e4e7", fontWeight: 500, marginTop: 2 }}>{src.primaryTarget}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>📍 타겟 지역:</span>
                  <div style={{ color: "#e4e4e7", fontWeight: 500, marginTop: 2 }}>{src.targetLocations}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>💳 정산 & 지급 방식:</span>
                  <div style={{ color: "#a1a1aa", marginTop: 2 }}>{src.payoutMethods.join(", ")}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>🔍 쿼리 전략:</span>
                  <div style={{ color: "#e4e4e7", fontFamily: "monospace", fontSize: 11, marginTop: 2 }}>{src.queryExample}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Back CTA */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <Link href="/upload" className="btn-primary" style={{ padding: "10px 24px", fontSize: 13 }}>
            {language === "ko" ? "이력서 검색하러 가기 →" : "Start Job Search →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
