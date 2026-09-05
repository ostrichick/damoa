"use client";

import { useState, useEffect, useRef, DragEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UploadMode = "file" | "linkedin" | "text";
type AnalysisStep = "idle" | "uploading" | "parsing" | "analyzing" | "done" | "error";

interface ProfileData {
  resume_id: number;
  name: string;
  email: string;
  skills: string[];
  level: string;
  total_years_experience: number;
  domains: string[];
  summary: string;
  education: { degree: string; school: string; field: string }[];
  experience: { title: string; company: string; duration: string }[];
}

interface ResumeApiResponse {
  success: boolean;
  message: string;
  profile: ProfileData;
}

type Profile = ProfileData;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>("file");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [savedProfile, setSavedProfile] = useState<ProfileData | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [error, setError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [location, setLocation] = useState("Remote");
  const [numResults, setNumResults] = useState(20);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Check for saved resume from localStorage or backend API on mount
  useEffect(() => {
    const loadSaved = async () => {
      // 1. Check localStorage first
      const local = typeof window !== "undefined" ? localStorage.getItem("damoa_saved_profile") : null;
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && parsed.resume_id) {
            setSavedProfile(parsed);
            return;
          }
        } catch (_) {}
      }

      // 2. Fetch latest from backend DB
      try {
        const res = await fetch(`${API_BASE}/api/resume/latest`);
        if (res.ok) {
          const data: ResumeApiResponse = await res.json();
          if (data.profile && data.profile.resume_id) {
            setSavedProfile(data.profile);
            if (typeof window !== "undefined") {
              localStorage.setItem("damoa_saved_profile", JSON.stringify(data.profile));
            }
          }
        }
      } catch (_) {}
    };

    loadSaved();
  }, [API_BASE]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".pdf") || dropped.name.endsWith(".docx"))) {
      setFile(dropped);
      setError("");
    } else {
      setError("PDF 또는 DOCX 파일만 지원합니다.");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError("");
    }
  };

  const stepMessages: Record<AnalysisStep, string> = {
    idle: "",
    uploading: "파일을 업로드하는 중...",
    parsing: "이력서 내용을 추출하는 중...",
    analyzing: "Gemini AI가 프로필을 분석하는 중...",
    done: "분석 완료!",
    error: "오류가 발생했습니다.",
  };

  const stepProgress: Record<AnalysisStep, number> = {
    idle: 0,
    uploading: 20,
    parsing: 50,
    analyzing: 80,
    done: 100,
    error: 0,
  };

  const handleSubmit = async () => {
    setError("");
    try {
      let uploadedProfile: Profile;

      if (mode === "file") {
        if (!file) { setError("파일을 선택해주세요."); return; }
        setStep("uploading");

        const formData = new FormData();
        formData.append("file", file);

        setStep("parsing");
        const res = await fetch(`${API_BASE}/api/resume/upload`, { method: "POST", body: formData });
        if (!res.ok) throw new Error(await res.text());
        setStep("analyzing");
        const data: ResumeApiResponse = await res.json();
        uploadedProfile = data.profile;

      } else if (mode === "text") {
        if (!resumeText.trim()) { setError("이력서 내용을 입력해주세요."); return; }
        setStep("analyzing");
        const res = await fetch(`${API_BASE}/api/resume/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: resumeText }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: ResumeApiResponse = await res.json();
        uploadedProfile = data.profile;

      } else {
        if (!linkedinUrl.trim()) { setError("LinkedIn URL을 입력해주세요."); return; }
        setStep("analyzing");
        const res = await fetch(`${API_BASE}/api/resume/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `LinkedIn Profile URL: ${linkedinUrl}` }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: ResumeApiResponse = await res.json();
        uploadedProfile = data.profile;
      }

      setStep("done");
      setProfile(uploadedProfile);
      setSavedProfile(uploadedProfile);
      if (typeof window !== "undefined") {
        localStorage.setItem("damoa_saved_profile", JSON.stringify(uploadedProfile));
      }

    } catch (err: unknown) {
      setStep("error");
      const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(message);
    }
  };

  const handleSearch = async () => {
    if (!profile) return;
    const promptParam = customPrompt ? `&custom_prompt=${encodeURIComponent(customPrompt)}` : "";
    router.push(`/results?resume_id=${profile.resume_id}&location=${encodeURIComponent(location)}&num=${numResults}${promptParam}`);
  };

  const levelColors: Record<string, string> = {
    junior: "#10b981",
    mid: "#06b6d4",
    senior: "#7c3aed",
    lead: "#f59e0b",
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <nav className="navbar" style={{ padding: "0 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["이력서 입력", "AI 분석", "공고 검색"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step === "done" && i < 2 ? "#10b981" :
                    (i === 0 && step !== "done") || (i === 1 && ["parsing", "analyzing", "done"].includes(step)) ? "linear-gradient(135deg, #7c3aed, #06b6d4)" :
                    "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "white"
                }}>
                  {step === "done" && i < 2 ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
                {i < 2 && <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>›</span>}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, fontFamily: "Outfit, sans-serif", marginBottom: 12 }}>
            <span className="gradient-text">
              {savedProfile && !showUploadZone && step === "idle" ? "내 이력서로 맞춤 공고 찾기" : "이력서를 입력해주세요"}
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            {savedProfile && !showUploadZone && step === "idle"
              ? "이전에 등록한 이력서가 저장되어 있습니다. 바로 검색하거나 새 이력서로 갱신할 수 있습니다."
              : "PDF/DOCX 파일, 텍스트 직접 입력, LinkedIn URL 중 편한 방법을 선택하세요"}
          </p>
        </div>

        {/* 1. Saved Resume Card (Instant Search Bypass) */}
        {savedProfile && !showUploadZone && (step === "idle" || step === "error") && (
          <div className="glass-card animate-fadeInUp" style={{
            padding: "28px 32px",
            marginBottom: 28,
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.16), rgba(6, 182, 212, 0.1))",
            border: "1px solid rgba(124, 58, 237, 0.35)",
            boxShadow: "0 10px 30px rgba(124, 58, 237, 0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, color: "white", fontWeight: 800, flexShrink: 0,
                  boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)"
                }}>
                  {savedProfile.name?.[0] || "✓"}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>{savedProfile.name || "등록된 이력서"}</span>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: "rgba(16, 185, 129, 0.15)", color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: 700
                    }}>
                      ✓ 저장된 이력서 사용 가능
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                    경력 {savedProfile.total_years_experience}년 · 보유 기술 {savedProfile.skills?.length || 0}개
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                    {savedProfile.skills?.slice(0, 5).map((s, i) => (
                      <span key={i} className="skill-tag neutral" style={{ fontSize: 11, padding: "2px 8px" }}>
                        {s}
                      </span>
                    ))}
                    {savedProfile.skills?.length > 5 && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>
                        +{savedProfile.skills.length - 5}개 더보기
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setProfile(savedProfile);
                    setStep("done");
                  }}
                  className="btn-primary animate-pulse-glow"
                  style={{ padding: "14px 28px", fontSize: 15 }}
                  id="use-saved-resume-btn"
                >
                  ⚡ 이 이력서로 바로 검색하기 →
                </button>
                <button
                  onClick={() => setShowUploadZone(true)}
                  className="btn-secondary"
                  style={{ padding: "14px 20px", fontSize: 14 }}
                  id="upload-new-resume-btn"
                >
                  🔄 새 이력서로 갱신하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back button if user opened the upload zone but wants to use saved profile */}
        {savedProfile && showUploadZone && (step === "idle" || step === "error") && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button
              onClick={() => setShowUploadZone(false)}
              className="btn-secondary"
              style={{ padding: "8px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              ← 이전 저장된 이력서 ({savedProfile.name}) 사용하기
            </button>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              새 파일을 올리시면 기존 이력서가 최신 내용으로 자동 갱신됩니다.
            </span>
          </div>
        )}

        {/* Mode Tabs (shown when no saved profile or user chose to upload new) */}
        {(!savedProfile || showUploadZone) && (step === "idle" || step === "error") && (
        <div style={{
          display: "flex", gap: 4, padding: 4,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 14, marginBottom: 28,
          border: "1px solid rgba(255,255,255,0.06)"
        }}>
          {([
            { key: "file", label: "📄 파일 업로드", desc: "PDF / DOCX" },
            { key: "text", label: "✏️ 텍스트 입력", desc: "직접 붙여넣기" },
            { key: "linkedin", label: "🔗 LinkedIn URL", desc: "프로필 연결" },
          ] as { key: UploadMode; label: string; desc: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setMode(tab.key); setError(""); }}
              style={{
                flex: 1, padding: "12px 16px",
                borderRadius: 10, border: "none", cursor: "pointer",
                background: mode === tab.key ? "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))" : "transparent",
                color: mode === tab.key ? "white" : "var(--text-muted)",
                fontWeight: mode === tab.key ? 600 : 400,
                fontSize: 14, transition: "all 0.25s ease",
                borderWidth: mode === tab.key ? 1 : 0,
                borderStyle: "solid",
                borderColor: mode === tab.key ? "rgba(124,58,237,0.4)" : "transparent",
              }}
            >
              <div>{tab.label}</div>
              <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{tab.desc}</div>
            </button>
          ))}
        </div>
        )}

        {/* Upload Area (shown when no saved profile or user chose to upload new) */}
        {(!savedProfile || showUploadZone) && (step === "idle" || step === "error") ? (
          <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
            {/* File Upload */}
            {mode === "file" && (
              <div>
                <div
                  className={`upload-zone ${dragging ? "dragging" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    id="resume-file-input"
                  />
                  {file ? (
                    <div>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                      <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{file.name}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        {(file.size / 1024).toFixed(1)} KB · 클릭해서 다른 파일 선택
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                      <p style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>
                        이력서 파일을 여기에 드래그하거나 클릭하세요
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
                        PDF, DOCX 파일 지원 · 최대 10MB
                      </p>
                      <span className="btn-secondary" style={{ fontSize: 13, padding: "10px 20px" }}>
                        파일 선택하기
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text Input */}
            {mode === "text" && (
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
                  이력서 내용을 아래에 붙여넣어 주세요
                </label>
                <textarea
                  className="input-field"
                  placeholder="이름, 연락처, 스킬, 경력, 학력 등의 내용을 자유롭게 입력하세요...

예시:
이름: 홍길동
이메일: hong@example.com
스킬: Python, React, TypeScript, AWS
경력:
- ABC 회사 (2021-현재): 백엔드 개발자
  - FastAPI, PostgreSQL 기반 REST API 개발
학력: 서울대학교 컴퓨터공학과 (2019)"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  style={{ minHeight: 280, resize: "vertical", lineHeight: 1.8 }}
                />
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
                  {resumeText.length} 자 · 자세할수록 더 정확한 매칭이 가능합니다
                </div>
              </div>
            )}

            {/* LinkedIn Input */}
            {mode === "linkedin" && (
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
                  LinkedIn 프로필 URL
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: "rgba(10,102,194,0.15)", border: "1px solid rgba(10,102,194,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>🔗</div>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://www.linkedin.com/in/yourprofile"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    id="linkedin-url-input"
                  />
                </div>
                <div style={{
                  marginTop: 20, padding: 16,
                  background: "rgba(245,158,11,0.08)", borderRadius: 12,
                  border: "1px solid rgba(245,158,11,0.2)",
                  fontSize: 13, color: "#fbbf24", lineHeight: 1.7,
                }}>
                  ⚠️ <strong>참고:</strong> LinkedIn의 bot 방지 정책으로 인해 프로필 크롤링이 제한될 수 있습니다.
                  공개 프로필인지 확인해주세요. 크롤링이 안 될 경우 텍스트 직접 입력을 권장합니다.
                </div>
              </div>
            )}
          </div>
        ) : step === "done" ? null : (
          /* Progress State */
          <div className="glass-card" style={{ padding: 40, marginBottom: 24, textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, margin: "0 auto 24px",
              border: "3px solid transparent",
              borderTopColor: "#7c3aed",
              borderRightColor: "#06b6d4",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{stepMessages[step]}</p>
            <div className="progress-bar" style={{ maxWidth: 320, margin: "0 auto" }}>
              <div className="progress-bar-fill" style={{ width: `${stepProgress[step]}%` }} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 12 }}>잠시만 기다려주세요...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: "16px 20px", borderRadius: 12, marginBottom: 20,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171", fontSize: 14, display: "flex", gap: 10, alignItems: "center",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Profile Result */}
        {step === "done" && profile && (
          <div className="glass-card animate-fadeInUp" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, color: "white", fontWeight: 700,
                  }}>
                    {profile.name?.[0] || "?"}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                      ✅ {profile.name || "분석 완료"}
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{profile.email || ""}</p>
                  </div>
                </div>
              </div>
              <div style={{
                padding: "6px 14px", borderRadius: 8,
                background: `rgba(${profile.level === "senior" ? "124,58,237" : profile.level === "mid" ? "6,182,212" : profile.level === "lead" ? "245,158,11" : "16,185,129"}, 0.15)`,
                border: `1px solid ${levelColors[profile.level] || "#10b981"}40`,
                color: levelColors[profile.level] || "#10b981",
                fontSize: 14, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em",
              }}>
                {profile.level || "junior"}
              </div>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{profile.summary}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>
                  스킬 ({profile.skills?.length || 0})
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.skills?.slice(0, 12).map((skill, i) => (
                    <span key={i} className="skill-tag neutral">{skill}</span>
                  ))}
                  {(profile.skills?.length || 0) > 12 && (
                    <span className="skill-tag neutral">+{profile.skills.length - 12}</span>
                  )}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>
                  도메인
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile.domains?.map((domain, i) => (
                    <span key={i} className="skill-tag cyan">{domain}</span>
                  ))}
                </div>
                <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>
                  경력 {profile.total_years_experience}년
                </p>
              </div>
            </div>

            {/* Search options */}
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, marginTop: 8
            }}>
              {/* Natural Language Prompt Card */}
              <div style={{
                marginBottom: 24, padding: 20, borderRadius: 16,
                background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(6, 182, 212, 0.08))",
                border: "1px solid rgba(124, 58, 237, 0.3)",
              }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  💬 희망 근무 조건 및 요청사항 (자연어 자유 입력)
                </label>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                  원하는 직무, 급여/시급 조건, 근무 시간, 정산 수단(페이팔 등), 구체적인 희망 조건을 자유롭게 설명해 보세요! AI가 이력서와 이 조건을 함께 분석해 추천합니다.
                </p>
                <textarea
                  className="input-field"
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder='예: "한국어 모어화자 대상 AI 원격 평가 일자리, 주 20시간 이하 파트타임, 페이팔 정산, 시급 $25 이상 희망합니다."'
                  id="custom-prompt-input"
                  style={{ resize: "vertical", fontSize: 14, lineHeight: 1.6 }}
                />
              </div>

              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🔍 기본 검색 설정</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>검색 지역</label>
                  <input
                    type="text"
                    className="input-field"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Remote, Worldwide, Seoul..."
                    id="location-input"
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "🌐 글로벌 원격 (Remote)", val: "Remote" },
                      { label: "🌍 전 세계 (Worldwide)", val: "Worldwide" },
                      { label: "🇰🇷 한국 포함 (Korea)", val: "Korea" },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLocation(preset.val)}
                        style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 6,
                          background: location === preset.val ? "rgba(124, 58, 237, 0.25)" : "rgba(255,255,255,0.05)",
                          color: location === preset.val ? "#c084fc" : "var(--text-secondary)",
                          border: location === preset.val ? "1px solid rgba(124, 58, 237, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>결과 수</label>
                  <select
                    className="input-field"
                    value={numResults}
                    onChange={(e) => setNumResults(Number(e.target.value))}
                    style={{ minWidth: 100 }}
                    id="num-results-select"
                  >
                    <option value={10}>10개</option>
                    <option value={20}>20개</option>
                    <option value={30}>30개</option>
                    <option value={50}>50개</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {step === "done" && profile ? (
            <button onClick={handleSearch} className="btn-primary animate-pulse-glow" style={{ fontSize: 16, padding: "18px 48px" }} id="start-search-btn">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803M10.5 7.5v6m3-3H7.5" />
              </svg>
              채용 공고 검색 시작하기
            </button>
          ) : step === "idle" || step === "error" ? (
            <button
              onClick={handleSubmit}
              className="btn-primary"
              style={{ fontSize: 16, padding: "18px 48px" }}
              id="analyze-btn"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI 분석 시작하기
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
