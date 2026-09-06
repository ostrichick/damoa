"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import Navbar from "../components/Navbar";
import { useLanguage } from "../context/LanguageContext";
import { translateTag, translateTags } from "../utils/tagTranslator";
import ErrorAlert from "../components/ErrorAlert";

interface Job {
  job_id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  platform: string;
  posted_date?: string;
  contract_type?: string;
  salary_type?: string;
  salary_amount?: string;
  trust_badge?: string;
  trust_rating?: string;
  payment_methods?: string[];
  payment_cycle?: string;
  trust_summary?: string;
  match_reason?: string;
  score_breakdown?: {
    skill_score: number;
    experience_score: number;
    domain_score?: number;
    education_score?: number;
    role_score?: number;
    location_score?: number;
    trust_score?: number;
  };
}

interface JobSearchApiResponse {
  success: boolean;
  search_id: number;
  total_jobs: number;
  jobs: Job[];
}

interface SearchResult {
  search_id: number;
  jobs: Job[];
  total: number;
  profile_summary?: {
    name: string;
    level: string;
    skills: string[];
    total_years_experience: number;
  };
}

type SortBy = "match_score" | "company" | "platform";
type FilterLevel = "all" | "80+" | "70+" | "60+";

function ScoreRing({ score }: { score: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle
          cx="36" cy="36" r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="5"
        />
        <circle
          cx="36" cy="36" r={radius}
          fill="transparent"
          stroke="#ffffff"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{Math.round(score)}%</span>
        <span style={{ fontSize: 9, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Match</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ width: 70, height: 70, borderRadius: 12, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 18, width: "50%", background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 14, width: "30%", background: "rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 12, width: "20%", background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ height: 12, width: "90%", background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
    </div>
  );
}

function JobCard({ job, language, t }: { job: Job; language: "en" | "ko"; t: (k: string) => string }) {
  return (
    <div
      key={job.job_id}
      className="glass-card animate-fadeInUp"
      style={{ padding: 24, border: "1px solid rgba(255, 255, 255, 0.08)" }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <ScoreRing score={job.match_score} />

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                  {job.company}
                </span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 4,
                  background: "rgba(255, 255, 255, 0.06)", color: "#a1a1aa",
                  textTransform: "uppercase"
                }}>
                  {job.platform}
                </span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fafafa" }}>
                {job.title}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                📍 {translateTag(job.location || "Remote / Korea", language)} {job.posted_date ? `· ${translateTag(job.posted_date, language)}` : ""}
              </p>
              {job.match_reason && (
                <div className="match-reason-box">
                  <span style={{ color: "#a1a1aa", fontWeight: 600 }}>
                    {language === "ko" ? "🎯 AI 적합도 근거:" : "🎯 Match Basis:"}
                  </span>
                  <span style={{ color: "#fafafa" }}>{job.match_reason}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {job.contract_type && (
                <span className="badge-contract">{translateTag(job.contract_type, language)}</span>
              )}
              {job.salary_amount && (
                <span className="badge-salary-type">💰 {translateTag(job.salary_amount, language)}</span>
              )}
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                {t("results.apply")}
              </a>
            </div>
          </div>

          {/* Platform Trust & Payment info box */}
          {job.trust_badge && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10, fontSize: 12
            }}>
              <span style={{ fontWeight: 600, color: "#e4e4e7" }}>
                {translateTag(job.trust_badge, language)}
              </span>
              {job.payment_methods && job.payment_methods.length > 0 && (
                <span style={{ color: "#a1a1aa" }}>
                  💳 {t("results.paymentMethods")}: {translateTags(job.payment_methods, language).join(", ")}
                </span>
              )}
            </div>
          )}

          {/* Matched skills */}
          {job.matched_skills && job.matched_skills.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 14 }}>
              {job.matched_skills.map((s, i) => (
                <span key={i} className="skill-tag matched">✓ {s}</span>
              ))}
              {job.missing_skills?.slice(0, 3).map((s, i) => (
                <span key={i} className="skill-tag missing">+ {s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TableRow({ job, language, t }: { job: Job; language: "en" | "ko"; t: (k: string) => string }) {
  return (
    <tr key={job.job_id}>
      <td>
        <span style={{
          fontWeight: 800, fontSize: 14, color: "#ffffff",
          padding: "3px 8px", borderRadius: 6,
          background: "rgba(255, 255, 255, 0.08)"
        }}>
          {Math.round(job.match_score)}%
        </span>
      </td>
      <td>
        <div style={{ fontWeight: 600, color: "#fafafa" }}>{job.company}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{job.platform}</div>
      </td>
      <td>
        <div style={{ fontWeight: 600, color: "#ffffff" }}>{job.title}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📍 {translateTag(job.location || "Remote / Korea", language)}</div>
        {job.match_reason && (
          <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <span>🎯</span>
            <span>{job.match_reason}</span>
          </div>
        )}
      </td>
      <td>
        <span className="badge-contract">
          {translateTag(job.contract_type || (language === "en" ? "Full-time" : "정규직"), language)}
        </span>
      </td>
      <td>
        <span style={{ fontSize: 12, color: "#e4e4e7" }}>
          {translateTag(job.salary_amount || (language === "en" ? "Negotiable" : "협의"), language)}
        </span>
      </td>
      <td>
        <div style={{ fontSize: 11, color: "#a1a1aa" }}>
          {translateTag(job.trust_badge || (language === "en" ? "Verified" : "검증 완료"), language)}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {translateTags(job.payment_methods || [language === "en" ? "Direct Bank Transfer" : "통장 입금"], language).join(", ")}
        </div>
      </td>
      <td>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 220 }}>
          {job.matched_skills?.slice(0, 3).map((s, i) => (
            <span key={i} className="skill-tag matched" style={{ fontSize: 10, padding: "1px 5px" }}>{s}</span>
          ))}
        </div>
      </td>
      <td>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ padding: "5px 12px", fontSize: 11, whiteSpace: "nowrap" }}
        >
          {t("results.apply")}
        </a>
      </td>
    </tr>
  );
}

function ResultsContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume_id");
  const location = searchParams.get("location") || "";
  const numResults = parseInt(searchParams.get("num") || "20");
  const customPrompt = searchParams.get("custom_prompt") || "";

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(5);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [searchStatus, setSearchStatus] = useState("1/4단계: 채용 플랫폼 연결 및 탐색 준비...");
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("match_score");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Dynamic progress & timer ticker
  useEffect(() => {
    if (!loading) return;

    setProgress(5);
    setElapsedSeconds(0);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedSeconds(elapsed);

      // Smooth multi-stage progress curve
      let currentProgress = 5;
      if (elapsed < 1.2) {
        currentProgress = 5 + (elapsed / 1.2) * 30;
      } else if (elapsed < 3.8) {
        currentProgress = 35 + ((elapsed - 1.2) / 2.6) * 40;
      } else if (elapsed < 6.5) {
        currentProgress = 75 + ((elapsed - 3.8) / 2.7) * 17;
      } else {
        currentProgress = 92 + (1 - Math.exp(-(elapsed - 6.5) / 6)) * 6;
      }
      setProgress(Math.min(98, Math.round(currentProgress)));

      // Dynamic real-time stage message
      if (elapsed < 1.2) {
        setSearchStatus(
          language === "ko"
            ? "1/4단계: 채용 플랫폼(사람인·잡코리아·링크드인) 연결 및 탐색 준비..."
            : "Stage 1/4: Connecting to job platforms..."
        );
      } else if (elapsed < 3.8) {
        setSearchStatus(
          language === "ko"
            ? "2/4단계: 멀티 플랫폼 병렬 크롤링 및 공고 실시간 수집 중..."
            : "Stage 2/4: Crawling multiple job platforms in parallel..."
        );
      } else if (elapsed < 6.5) {
        setSearchStatus(
          language === "ko"
            ? "3/4단계: AI 5대 지표(직무·지역·스킬·경력·신뢰도) 적합도 정밀 평가 중..."
            : "Stage 3/4: Calculating 5-factor AI candidate match scores..."
        );
      } else {
        setSearchStatus(
          language === "ko"
            ? "4/4단계: 최적 적합도 공고 선별 및 추천 순위 패키징 중..."
            : "Stage 4/4: Ranking and packaging top recommendations..."
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [loading, language]);

  const startSearch = useCallback(async () => {
    if (!resumeId) {
      setError(language === "ko" ? "이력서 ID가 없습니다. 다시 업로드해주세요." : "Missing resume ID. Please upload a resume first.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch(`${API_BASE}/api/jobs/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          resume_id: parseInt(resumeId),
          location,
          num_results: numResults,
          custom_prompt: customPrompt,
        }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(await res.text());

      const data: JobSearchApiResponse = await res.json();

      let profileSummary;
      try {
        const pRes = await fetch(`${API_BASE}/api/resume/${resumeId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          profileSummary = pData.profile;
        }
      } catch (_) {}

      setProgress(100);
      setSearchStatus(language === "ko" ? "분석 완료! 맞춤 채용공고를 표시합니다." : "Complete! Displaying matched jobs.");
      await new Promise((r) => setTimeout(r, 200));

      setResult({
        search_id: data.search_id,
        jobs: data.jobs,
        total: data.total_jobs,
        profile_summary: profileSummary,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      let msg = err instanceof Error ? err.message : "Search failed. Please try again.";
      if (err instanceof Error && err.name === "AbortError") {
        msg = language === "ko"
          ? "서버 응답 시간(25초)이 초과되었습니다. 무료 클라우드 서버가 절전 모드에서 깨어나는 중일 수 있으니 아래 [다시 시도] 버튼을 눌러주세요."
          : "Request timed out (25s). The cloud server might be waking up from sleep. Please click retry.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, resumeId, location, numResults, customPrompt, language]);

  useEffect(() => {
    startSearch();
  }, [startSearch]);

  const filteredJobs = (result?.jobs || [])
    .filter((j) => {
      if (filterLevel === "80+") return j.match_score >= 80;
      if (filterLevel === "70+") return j.match_score >= 70;
      if (filterLevel === "60+") return j.match_score >= 60;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "match_score") return b.match_score - a.match_score;
      if (sortBy === "company") return a.company.localeCompare(b.company);
      if (sortBy === "platform") return a.platform.localeCompare(b.platform);
      return 0;
    });

  // Split into Top-Tier Matches and Extended/Broader Matches (겉절이)
  const TOP_TIER_THRESHOLD = 65;
  let primaryJobs = filteredJobs.filter((j) => j.match_score >= TOP_TIER_THRESHOLD);
  let secondaryJobs = filteredJobs.filter((j) => j.match_score < TOP_TIER_THRESHOLD);

  // Dynamic fallback: if all scores are below 65%, take the top cluster as primary
  if (primaryJobs.length === 0 && filteredJobs.length > 0) {
    const highestScore = Math.max(...filteredJobs.map((j) => j.match_score));
    const dynamicThreshold = Math.max(30, highestScore - 10);
    primaryJobs = filteredJobs.filter((j) => j.match_score >= dynamicThreshold);
    secondaryJobs = filteredJobs.filter((j) => j.match_score < dynamicThreshold);
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar currentStep={3} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16, marginBottom: 28
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link href="/upload" className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
                {t("results.back")}
              </Link>
              <Link href="/admin/sources" className="btn-secondary" style={{ padding: "6px 10px", fontSize: 12 }} title="Admin Crawler Sources">
                ⚙️ {language === "ko" ? "크롤러 소스" : "Sources"}
              </Link>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fafafa" }}>
                {t("results.title")}
              </h1>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
              {t("results.subtitle")}
            </p>
          </div>

          {/* View switcher & Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="view-toggle-container">
              <button
                onClick={() => setViewMode("card")}
                className={`view-toggle-btn ${viewMode === "card" ? "active" : ""}`}
              >
                {t("results.cardView")}
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
              >
                {t("results.tableView")}
              </button>
            </div>

            {/* Filter */}
            <select
              className="input-field"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
              style={{ padding: "6px 12px", fontSize: 12, width: "auto" }}
            >
              <option value="all">{t("results.filterAll")}</option>
              <option value="80+">80%+ Match</option>
              <option value="70+">70%+ Match</option>
              <option value="60+">60%+ Match</option>
            </select>

            {/* Sort */}
            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              style={{ padding: "6px 12px", fontSize: 12, width: "auto" }}
            >
              <option value="match_score">{t("results.sortMatch")}</option>
              <option value="company">Company</option>
              <option value="platform">Platform</option>
            </select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div>
            <div className="glass-card animate-fadeInUp" style={{ padding: "36px 24px", textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fafafa", marginBottom: 8 }}>
                {searchStatus}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 360, margin: "0 auto 8px auto", fontSize: 12, color: "#a1a1aa" }}>
                <span>{language === "ko" ? "실시간 진행률" : "Progress"}: <strong style={{ color: "#ffffff" }}>{progress}%</strong></span>
                <span>⏱️ {elapsedSeconds.toFixed(1)}s {language === "ko" ? "경과 (평균 4~6초)" : "elapsed (avg 4-6s)"}</span>
              </div>
              <div className="progress-bar" style={{ maxWidth: 360, margin: "0 auto" }}>
                <div className="progress-bar-fill-animated" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && <ErrorAlert error={error} onRetry={startSearch} />}

        {/* Results List */}
        {!loading && !error && (
          <div>
            {filteredJobs.length === 0 ? (
              <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{t("results.empty")}</p>
              </div>
            ) : viewMode === "card" ? (
              /* CARD VIEW */
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Top-Tier Section Header */}
                {primaryJobs.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 4,
                        background: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.15)"
                      }}>
                        🎯 {language === "ko" ? "최적화 맞춤 추천" : "Top Recommended Matches"}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {primaryJobs.length}{language === "ko" ? "개 우선 추천 공고" : " primary vacancies"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Top-Tier Cards */}
                {primaryJobs.map((job) => (
                  <JobCard key={job.job_id} job={job} language={language} t={t} />
                ))}

                {/* Visual Separator for Extended / Broader Opportunities (겉절이) */}
                {secondaryJobs.length > 0 && (
                  <div>
                    <div className="extended-results-divider">
                      <div className="extended-divider-line" />
                      <div className="extended-divider-badge">
                        <span>🌐 {language === "ko" ? "추가 탐색 기회 (기타 지역 및 인접 직무 · 겉절이 추천)" : "Extended Discovery & Adjacent Opportunities"}</span>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 12,
                          background: "rgba(255,255,255,0.1)", color: "#a1a1aa"
                        }}>
                          {secondaryJobs.length}{language === "ko" ? "개 추가 공고" : " more"}
                        </span>
                      </div>
                      <div className="extended-divider-line right" />
                    </div>

                    <p style={{
                      textAlign: "center", marginBottom: 18, color: "var(--text-muted)", fontSize: 12
                    }}>
                      💡 {language === "ko"
                        ? "희망 지역 외 전국/해외 공고 및 인접 직무에서 발굴된 기회입니다. 스크롤을 내려 다양한 가능성을 탐색해보세요."
                        : "Broadened opportunities across other cities, nationwide roles, and adjacent job families. Scroll down to discover more."}
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {secondaryJobs.map((job) => (
                        <JobCard key={job.job_id} job={job} language={language} t={t} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="glass-table-container">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>{t("results.colScore")}</th>
                      <th>{t("results.colCompany")}</th>
                      <th>{t("results.colTitle")}</th>
                      <th>{t("results.colContract")}</th>
                      <th>{t("results.colSalary")}</th>
                      <th>{t("results.colTrust")}</th>
                      <th>{t("results.colSkills")}</th>
                      <th>{t("results.colAction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Primary Matches */}
                    {primaryJobs.map((job) => (
                      <TableRow key={job.job_id} job={job} language={language} t={t} />
                    ))}

                    {/* Table View Divider */}
                    {secondaryJobs.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={8} style={{ padding: "18px 0", background: "rgba(0,0,0,0.4)" }}>
                            <div className="extended-results-divider" style={{ margin: "0 auto", maxWidth: "90%" }}>
                              <div className="extended-divider-line" />
                              <div className="extended-divider-badge">
                                <span>🌐 {language === "ko" ? "추가 탐색 기회 (기타 지역 및 인접 직무 · 겉절이)" : "Extended Discovery & Adjacent Opportunities"}</span>
                                <span style={{
                                  fontSize: 11, padding: "2px 8px", borderRadius: 12,
                                  background: "rgba(255,255,255,0.1)", color: "#a1a1aa"
                                }}>
                                  {secondaryJobs.length}{language === "ko" ? "개 추가 공고" : " more"}
                                </span>
                              </div>
                              <div className="extended-divider-line right" />
                            </div>
                          </td>
                        </tr>
                        {secondaryJobs.map((job) => (
                          <TableRow key={job.job_id} job={job} language={language} t={t} />
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#a1a1aa" }}>Loading results...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
