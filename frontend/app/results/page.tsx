"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

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
  score_breakdown?: {
    skill_score: number;
    experience_score: number;
    domain_score: number;
    education_score: number;
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
type FilterLevel = "all" | "90+" | "80+" | "70+";

function ScoreRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#06b6d4" : score >= 55 ? "#7c3aed" : "#f59e0b";

  return (
    <div className="score-ring">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="score-value">
        <span className="score-number" style={{ color }}>{score}</span>
        <span className="score-label">적합도</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 20, width: "60%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: "40%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: "30%" }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 14, marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: "80%" }} />
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume_id");
  const location = searchParams.get("location") || "";
  const numResults = parseInt(searchParams.get("num") || "20");
  const customPrompt = searchParams.get("custom_prompt") || "";

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchStatus, setSearchStatus] = useState("채용 공고를 검색하는 중...");
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("match_score");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const startSearch = useCallback(async () => {
    if (!resumeId) { setError("이력서 ID가 없습니다. 다시 업로드해주세요."); setLoading(false); return; }
    try {
      setSearchStatus("LinkedIn에서 채용 공고를 수집하는 중...");
      const res = await fetch(`${API_BASE}/api/jobs/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: parseInt(resumeId),
          location,
          num_results: numResults,
          custom_prompt: customPrompt,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      setSearchStatus("AI 적합도를 계산하는 중...");
      const data: JobSearchApiResponse = await res.json();

      // Fetch resume profile summary for sidebar
      let profileSummary = undefined;
      try {
        const pRes = await fetch(`${API_BASE}/api/resume/${resumeId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          const p = pData.profile;
          profileSummary = {
            name: p.name || "",
            level: p.level || "mid",
            skills: p.skills || [],
            total_years_experience: p.total_years_experience || 0,
          };
        }
      } catch (_) { /* ignore */ }

      setResult({
        search_id: data.search_id,
        jobs: data.jobs,
        total: data.total_jobs,
        profile_summary: profileSummary,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resumeId, location, numResults, customPrompt, API_BASE]);

  useEffect(() => {
    startSearch();
  }, [startSearch]);

  const filteredJobs = result?.jobs
    .filter((j) => {
      if (filterLevel === "90+") return j.match_score >= 90;
      if (filterLevel === "80+") return j.match_score >= 80;
      if (filterLevel === "70+") return j.match_score >= 70;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "match_score") return b.match_score - a.match_score;
      if (sortBy === "company") return a.company.localeCompare(b.company);
      if (sortBy === "platform") return a.platform.localeCompare(b.platform);
      return 0;
    }) || [];

  const platformColors: Record<string, string> = {
    linkedin: "linkedin",
    wanted: "wanted",
    saramin: "saramin",
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <nav className="navbar" style={{ padding: "0 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "white"
            }}>D</div>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
              <span className="gradient-text">다모아</span>
            </span>
          </Link>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/upload" className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>
              ← 이력서 재분석
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <div>
            {/* Loading State */}
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{
                width: 64, height: 64, margin: "0 auto 20px",
                border: "3px solid transparent",
                borderTopColor: "#7c3aed",
                borderRightColor: "#06b6d4",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                <span className="gradient-text">채용 공고 분석 중</span>
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{searchStatus}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>⚠️</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>검색 중 문제가 발생했습니다</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>{error}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={startSearch} className="btn-primary">다시 시도</button>
              <Link href="/upload" className="btn-secondary">이력서 재업로드</Link>
            </div>
          </div>
        ) : result ? (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
            {/* Left Sidebar - Profile */}
            <div style={{ position: "sticky", top: 80 }}>
              <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: "white", fontWeight: 700,
                  }}>
                    {result.profile_summary?.name?.[0] || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{result.profile_summary?.name || "분석 완료"}</div>
                    <div style={{
                      display: "inline-flex", fontSize: 11, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 4, marginTop: 4,
                      background: "rgba(124,58,237,0.15)", color: "#a78bfa",
                      textTransform: "uppercase" as const, letterSpacing: "0.05em"
                    }}>
                      {result.profile_summary?.level || "N/A"}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>
                    보유 스킬
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.profile_summary?.skills?.slice(0, 15).map((skill, i) => (
                      <span key={i} className="skill-tag neutral" style={{ fontSize: 11 }}>{skill}</span>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                  <span>경력</span>
                  <span style={{ fontWeight: 600 }}>{result.profile_summary?.total_years_experience}년</span>
                </div>
              </div>

              {/* Stats */}
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text-secondary)" }}>검색 결과</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "총 공고", value: result.total },
                    { label: "90% 이상", value: result.jobs.filter(j => j.match_score >= 90).length },
                    { label: "80% 이상", value: result.jobs.filter(j => j.match_score >= 80).length },
                    { label: "평균 적합도", value: `${Math.round(result.jobs.reduce((a, b) => a + b.match_score, 0) / result.jobs.length)}%` },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      padding: "12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.03)", textAlign: "center"
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
                        <span className="gradient-text">{stat.value}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div>
              {/* Header + Filters */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>
                  <span className="gradient-text">{filteredJobs.length}개</span> 추천 공고
                </h1>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {/* View Mode Toggle */}
                  <div className="view-toggle-container">
                    <button
                      className={`view-toggle-btn ${viewMode === "card" ? "active" : ""}`}
                      onClick={() => setViewMode("card")}
                      id="view-mode-card-btn"
                    >
                      🎴 카드형
                    </button>
                    <button
                      className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                      onClick={() => setViewMode("table")}
                      id="view-mode-table-btn"
                    >
                      📊 테이블형
                    </button>
                  </div>

                  {/* Filter by score */}
                  <select
                    className="input-field"
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
                    style={{ padding: "8px 12px", fontSize: 13, width: "auto" }}
                    id="filter-select"
                  >
                    <option value="all">전체 보기</option>
                    <option value="90+">90% 이상</option>
                    <option value="80+">80% 이상</option>
                    <option value="70+">70% 이상</option>
                  </select>
                  {/* Sort */}
                  <select
                    className="input-field"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    style={{ padding: "8px 12px", fontSize: 13, width: "auto" }}
                    id="sort-select"
                  >
                    <option value="match_score">적합도 순</option>
                    <option value="company">회사명 순</option>
                    <option value="platform">플랫폼 순</option>
                  </select>
                </div>
              </div>

              {/* View Rendering: Table View or Card View */}
              {viewMode === "table" ? (
                <div className="glass-table-container animate-fadeIn">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80, textAlign: "center" }}>적합도</th>
                        <th>회사명 / 플랫폼</th>
                        <th>채용 공고 / 위치</th>
                        <th>계약 형태</th>
                        <th>급여 조건</th>
                        <th>플랫폼 신뢰도 & 정산</th>
                        <th>매칭 스킬</th>
                        <th style={{ textAlign: "right" }}>지원</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
                            해당 조건의 공고가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredJobs.map((job) => {
                          const scoreColor = job.match_score >= 85 ? "#10b981" : job.match_score >= 70 ? "#06b6d4" : job.match_score >= 55 ? "#7c3aed" : "#f59e0b";
                          return (
                            <tr key={job.job_id} id={`job-row-${job.job_id}`}>
                              <td style={{ textAlign: "center" }}>
                                <span style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 20,
                                  fontWeight: 800,
                                  fontSize: 13,
                                  background: `${scoreColor}20`,
                                  color: scoreColor,
                                  border: `1px solid ${scoreColor}40`
                                }}>
                                  {job.match_score}%
                                </span>
                              </td>
                              <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{
                                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                                    background: `linear-gradient(135deg, hsl(${(job.company.charCodeAt(0) * 17) % 360}, 60%, 35%), hsl(${(job.company.charCodeAt(0) * 37) % 360}, 60%, 25%))`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, fontWeight: 800, color: "white",
                                  }}>
                                    {job.company[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div>{job.company}</div>
                                    <span className={`platform-badge ${platformColors[job.platform.toLowerCase()] || "linkedin"}`} style={{ fontSize: 9, padding: "1px 6px" }}>
                                      {job.platform}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                                >
                                  {job.title}
                                </a>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                  📍 {job.location}
                                </div>
                              </td>
                              <td>
                                <span className={`badge-contract ${job.contract_type || '정규직'}`}>
                                  {job.contract_type || '정규직'}
                                </span>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <div className="badge-salary-type" style={{ marginBottom: 4 }}>
                                  {job.salary_type || '연봉'}
                                </div>
                                <div style={{ fontWeight: 600, color: "#22d3ee", fontSize: 13 }}>
                                  {job.salary_amount || '회사내규'}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>
                                  {job.trust_badge || '🟢 검증된 플랫폼'}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                                  💳 {(job.payment_methods || ["PayPal", "통장입금"]).join(", ")}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  ⏱️ {job.payment_cycle || "월급 / 주급"}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 200 }}>
                                  {job.matched_skills?.slice(0, 4).map((skill, i) => (
                                    <span key={i} className="skill-tag matched" style={{ fontSize: 11, padding: "2px 8px" }}>
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-primary"
                                  style={{ padding: "6px 14px", fontSize: 12 }}
                                >
                                  지원 →
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Job Cards View */
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {filteredJobs.length === 0 ? (
                    <div className="glass-card" style={{ padding: 48, textAlign: "center" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                      <p style={{ color: "var(--text-secondary)" }}>해당 조건의 공고가 없습니다.</p>
                    </div>
                  ) : filteredJobs.map((job, idx) => (
                    <div
                      key={job.job_id}
                      className={`glass-card animate-fadeInUp animate-delay-${Math.min(idx + 1, 5)}`}
                      style={{ padding: 24, cursor: "pointer", transition: "all 0.3s ease" }}
                      onClick={() => setSelectedJob(selectedJob?.job_id === job.job_id ? null : job)}
                      id={`job-card-${job.job_id}`}
                    >
                      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                        {/* Company logo placeholder */}
                        <div style={{
                          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                          background: `linear-gradient(135deg, hsl(${(job.company.charCodeAt(0) * 17) % 360}, 60%, 35%), hsl(${(job.company.charCodeAt(0) * 37) % 360}, 60%, 25%))`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.9)",
                        }}>
                          {job.company[0]?.toUpperCase()}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                            <div style={{ minWidth: 0 }}>
                              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{job.title}</h3>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>{job.company}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>·</span>
                                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>📍 {job.location}</span>
                                {job.posted_date && (
                                  <>
                                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>·</span>
                                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>🕐 {job.posted_date}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ScoreRing score={job.match_score} />
                          </div>

                          {/* Badges */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                            <span className={`platform-badge ${platformColors[job.platform.toLowerCase()] || "linkedin"}`}>
                              {job.platform}
                            </span>
                            <span className={`badge-contract ${job.contract_type || '정규직'}`}>
                              {job.contract_type || '정규직'}
                            </span>
                            <span className="badge-salary-type">
                              💰 {job.salary_type || '연봉'}: {job.salary_amount || '회사내규에 따름'}
                            </span>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
                              borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)"
                            }}>
                              {job.trust_badge || '🟢 검증된 플랫폼'}
                            </span>
                          </div>

                          {/* Skills */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                            {job.matched_skills?.slice(0, 6).map((skill, i) => (
                              <span key={i} className="skill-tag matched">✓ {skill}</span>
                            ))}
                            {job.missing_skills?.slice(0, 3).map((skill, i) => (
                              <span key={i} className="skill-tag missing">✗ {skill}</span>
                            ))}
                          </div>

                          {/* Expanded description */}
                          {selectedJob?.job_id === job.job_id && (
                            <div className="animate-fadeIn" style={{
                              marginTop: 16, padding: 16,
                              background: "rgba(255,255,255,0.03)",
                              borderRadius: 12, fontSize: 14,
                              color: "var(--text-secondary)", lineHeight: 1.8,
                              borderTop: "1px solid rgba(255,255,255,0.06)",
                            }}>
                              <p style={{ marginBottom: 12 }}>{job.description}</p>

                              {/* Platform Trust & Payment Section */}
                              <div style={{
                                marginTop: 12, padding: 14, borderRadius: 12,
                                background: "rgba(124, 58, 237, 0.08)", border: "1px solid rgba(124, 58, 237, 0.2)",
                                fontSize: 13, color: "var(--text-primary)"
                              }}>
                                <div style={{ fontWeight: 700, marginBottom: 6, color: "#a78bfa", display: "flex", alignItems: "center", gap: 6 }}>
                                  🛡️ 플랫폼 신뢰도 분석 & 보수 정산 가이드
                                </div>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
                                  {job.trust_summary || "정식 승인된 안전 원격 플랫폼입니다."}
                                </p>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
                                  <span>💳 지불 수단: <strong style={{ color: "#22d3ee" }}>{(job.payment_methods || ["PayPal", "통장입금"]).join(", ")}</strong></span>
                                  <span>⏱️ 지급 주기: <strong style={{ color: "#34d399" }}>{job.payment_cycle || "월급 / 주급"}</strong></span>
                                </div>
                              </div>

                              {job.missing_skills?.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                                    부족한 스킬
                                  </p>
                                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                    {job.missing_skills.map((skill, i) => (
                                      <span key={i} className="skill-tag missing">✗ {skill}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary"
                              style={{ padding: "8px 18px", fontSize: 13 }}
                              onClick={(e) => e.stopPropagation()}
                              id={`apply-btn-${job.job_id}`}
                            >
                              지원하기 →
                            </a>
                            <button
                              style={{
                                padding: "8px 14px", fontSize: 13, background: "transparent",
                                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                                color: "var(--text-secondary)", cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                              onClick={(e) => { e.stopPropagation(); setSelectedJob(selectedJob?.job_id === job.job_id ? null : job); }}
                            >
                              {selectedJob?.job_id === job.job_id ? "접기 ↑" : "상세보기 ↓"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, margin: "0 auto 20px",
            border: "3px solid transparent",
            borderTopColor: "#7c3aed",
            borderRightColor: "#06b6d4",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
