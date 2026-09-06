"use client";

import { useState, useEffect, useRef, DragEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { useLanguage } from "../context/LanguageContext";
import ErrorAlert from "../components/ErrorAlert";

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

export default function UploadPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<UploadMode>("file");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<ProfileData[]>([]);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [error, setError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [location, setLocation] = useState("Korea");
  const [numResults, setNumResults] = useState(20);
  const [uploadProgress, setUploadProgress] = useState(10);
  const [uploadElapsedSeconds, setUploadElapsedSeconds] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Dynamic progress & timer ticker for resume upload / analysis
  useEffect(() => {
    if (!["uploading", "parsing", "analyzing"].includes(step)) return;

    setUploadProgress(10);
    setUploadElapsedSeconds(0);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setUploadElapsedSeconds(elapsed);

      let p = 10;
      if (elapsed < 1.0) {
        p = 10 + (elapsed / 1.0) * 30; // 10 -> 40
      } else if (elapsed < 3.0) {
        p = 40 + ((elapsed - 1.0) / 2.0) * 35; // 40 -> 75
      } else if (elapsed < 6.0) {
        p = 75 + ((elapsed - 3.0) / 3.0) * 18; // 75 -> 93
      } else {
        p = 93 + (1 - Math.exp(-(elapsed - 6.0) / 5)) * 5; // 93 -> 98
      }
      setUploadProgress(Math.min(98, Math.round(p)));

      if (elapsed < 1.2) {
        setUploadStatusText(
          language === "ko"
            ? "1/3단계: 이력서 문서 파싱 및 텍스트 데이터 추출 중..."
            : "Stage 1/3: Parsing document and extracting text data..."
        );
      } else if (elapsed < 3.5) {
        setUploadStatusText(
          language === "ko"
            ? "2/3단계: Gemini AI 언어 모델 연결 및 프로필 구조화 중..."
            : "Stage 2/3: Structuring candidate profile with Gemini AI..."
        );
      } else {
        setUploadStatusText(
          language === "ko"
            ? "3/3단계: 전문 스킬, 경력 연수, 직무 도메인 정밀 분류 중..."
            : "Stage 3/3: Classifying skills, experience, and job domains..."
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [step, language]);

  // Check for saved resume profiles from localStorage or backend API on mount
  useEffect(() => {
    const loadSaved = async () => {
      const profiles: ProfileData[] = [];

      // 1. Check localStorage list
      if (typeof window !== "undefined") {
        const listStr = localStorage.getItem("damoa_saved_profiles");
        if (listStr) {
          try {
            const parsed = JSON.parse(listStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSavedProfiles(parsed);
              return;
            }
          } catch (_) {}
        }

        // Check single legacy key
        const singleStr = localStorage.getItem("damoa_saved_profile");
        if (singleStr) {
          try {
            const single = JSON.parse(singleStr);
            if (single && single.resume_id) {
              profiles.push(single);
            }
          } catch (_) {}
        }
      }

      // 2. Fetch latest from backend DB if empty
      if (profiles.length === 0) {
        try {
          const res = await fetch(`${API_BASE}/api/resume/latest`);
          if (res.ok) {
            const data: ResumeApiResponse = await res.json();
            if (data.profile && data.profile.resume_id) {
              profiles.push(data.profile);
            }
          }
        } catch (_) {}
      }

      if (profiles.length > 0) {
        setSavedProfiles(profiles);
        if (typeof window !== "undefined") {
          localStorage.setItem("damoa_saved_profiles", JSON.stringify(profiles));
        }
      }
    };

    loadSaved();
  }, [API_BASE]);

  const saveProfileToList = (newProfile: ProfileData) => {
    setSavedProfiles((prev) => {
      const filtered = prev.filter((p) => p.name !== newProfile.name && p.resume_id !== newProfile.resume_id);
      const updated = [newProfile, ...filtered];
      if (typeof window !== "undefined") {
        localStorage.setItem("damoa_saved_profiles", JSON.stringify(updated));
        localStorage.setItem("damoa_saved_profile", JSON.stringify(newProfile));
      }
      return updated;
    });
  };

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
      setError(language === "ko" ? "PDF 또는 DOCX 파일만 지원합니다." : "Only PDF or DOCX files are supported.");
    }
  }, [language]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError("");
    }
  };

  const handleSubmit = async () => {
    setError("");
    try {
      let uploadedProfile: ProfileData;

      if (mode === "file") {
        if (!file) {
          setError(language === "ko" ? "파일을 선택해주세요." : "Please select a resume file.");
          return;
        }
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
        if (!resumeText.trim()) {
          setError(language === "ko" ? "이력서 내용을 입력해주세요." : "Please paste resume text.");
          return;
        }
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
        if (!linkedinUrl.trim()) {
          setError(language === "ko" ? "LinkedIn URL을 입력해주세요." : "Please enter a LinkedIn profile URL.");
          return;
        }
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

      setUploadProgress(100);
      setUploadStatusText(language === "ko" ? "분석 완료! 프로필을 생성했습니다." : "Analysis complete! Profile created.");
      await new Promise((r) => setTimeout(r, 200));

      setStep("done");
      setProfile(uploadedProfile);
      saveProfileToList(uploadedProfile);

    } catch (err: unknown) {
      setStep("error");
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    }
  };

  const handleSearch = async () => {
    if (!profile) return;
    const promptParam = customPrompt ? `&custom_prompt=${encodeURIComponent(customPrompt)}` : "";
    router.push(`/results?resume_id=${profile.resume_id}&location=${encodeURIComponent(location)}&num=${numResults}${promptParam}`);
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar currentStep={step === "done" ? 2 : 1} />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>
            <span className="gradient-text">
              {savedProfiles.length > 0 && !showUploadZone && step === "idle"
                ? t("upload.savedTitle")
                : t("upload.newTitle")}
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            {savedProfiles.length > 0 && !showUploadZone && step === "idle"
              ? t("upload.savedDesc")
              : t("upload.newDesc")}
          </p>
        </div>

        {/* 1. Saved Profiles Selector (Multi-Profile Support for User & Wife!) */}
        {savedProfiles.length > 0 && !showUploadZone && (step === "idle" || step === "error") && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {savedProfiles.map((p, idx) => (
                <div
                  key={idx}
                  className="glass-card animate-fadeInUp"
                  style={{
                    padding: "24px 28px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(24, 24, 27, 0.8)",
                  }}
                >
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 12,
                      background: "linear-gradient(180deg, #ffffff 0%, #71717a 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, color: "#09090b", fontWeight: 800, flexShrink: 0
                    }}>
                      {p.name?.[0] || "✓"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: "#fafafa" }}>{p.name}</span>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 6,
                          background: "rgba(255, 255, 255, 0.08)", color: "#e4e4e7",
                          border: "1px solid rgba(255, 255, 255, 0.12)", fontWeight: 600
                        }}>
                          {p.level?.toUpperCase() || "CANDIDATE"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                        {p.total_years_experience} {t("upload.expYears")} · {p.skills?.length || 0} {t("upload.skillsCount")}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                        {p.skills?.slice(0, 5).map((s, i) => (
                          <span key={i} className="skill-tag" style={{ fontSize: 11, padding: "2px 7px" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => {
                        setProfile(p);
                        setStep("done");
                      }}
                      className="btn-primary"
                      style={{ padding: "10px 22px", fontSize: 13 }}
                    >
                      {t("upload.useThis")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => setShowUploadZone(true)}
                className="btn-secondary"
                style={{ padding: "12px 24px", fontSize: 14 }}
              >
                {t("upload.update")}
              </button>
            </div>
          </div>
        )}

        {/* Back button if user opened the upload zone */}
        {savedProfiles.length > 0 && showUploadZone && (step === "idle" || step === "error") && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <button
              onClick={() => setShowUploadZone(false)}
              className="btn-secondary"
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              {t("upload.useSavedBack")}
            </button>
          </div>
        )}

        {/* Mode Tabs */}
        {(!savedProfiles.length || showUploadZone) && (step === "idle" || step === "error") && (
          <div style={{
            display: "flex", gap: 6, padding: 4,
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: 12, marginBottom: 24,
            border: "1px solid rgba(255, 255, 255, 0.08)"
          }}>
            {([
              { key: "file", label: t("upload.tabFile") },
              { key: "text", label: t("upload.tabText") },
              { key: "linkedin", label: t("upload.tabLinkedIn") },
            ] as { key: UploadMode; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setMode(tab.key); setError(""); }}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  background: mode === tab.key ? "#ffffff" : "transparent",
                  color: mode === tab.key ? "#09090b" : "#a1a1aa",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Zone */}
        {(!savedProfiles.length || showUploadZone) && (step === "idle" || step === "error") && (
          <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
            {mode === "file" && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? "#ffffff" : "rgba(255, 255, 255, 0.12)"}`,
                  borderRadius: 14, padding: "48px 24px", textAlign: "center",
                  cursor: "pointer", background: dragging ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.01)",
                  transition: "all 0.2s"
                }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleFileSelect} style={{ display: "none" }} />
                <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                {file ? (
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16, color: "#fafafa", marginBottom: 4 }}>{file.name}</p>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 15, color: "#e4e4e7", marginBottom: 6 }}>
                      {t("upload.dropText")} <span style={{ color: "#ffffff", textDecoration: "underline" }}>{t("upload.dropBrowse")}</span>
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{t("upload.dropHint")}</p>
                  </div>
                )}
              </div>
            )}

            {mode === "text" && (
              <textarea
                className="input-field"
                rows={8}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder={t("upload.textPlaceholder")}
                style={{ resize: "vertical" }}
              />
            )}

            {mode === "linkedin" && (
              <input
                type="url"
                className="input-field"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder={t("upload.linkedinPlaceholder")}
              />
            )}

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                style={{ padding: "12px 32px", fontSize: 14 }}
              >
                {t("upload.analyzeBtn")}
              </button>
            </div>
          </div>
        )}

        {/* Progress indicator during analysis */}
        {["uploading", "parsing", "analyzing"].includes(step) && (
          <div className="glass-card animate-fadeInUp" style={{ padding: "36px 24px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fafafa", marginBottom: 8 }}>
              {uploadStatusText || t("upload.analyzing")}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 360, margin: "0 auto 8px auto", fontSize: 12, color: "#a1a1aa" }}>
              <span>{language === "ko" ? "실시간 진행률" : "Progress"}: <strong style={{ color: "#ffffff" }}>{uploadProgress}%</strong></span>
              <span>⏱️ {uploadElapsedSeconds.toFixed(1)}s {language === "ko" ? "경과 (평균 3~5초)" : "elapsed (avg 3-5s)"}</span>
            </div>
            <div className="progress-bar" style={{ maxWidth: 360, margin: "0 auto" }}>
              <div className="progress-bar-fill-animated" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Structured Step-Based Error Alert */}
        {error && <ErrorAlert error={error} onRetry={handleSubmit} />}

        {/* Warning if profile summary indicates AI analysis error */}
        {profile && (profile.summary.includes("Step 2") || profile.summary.includes("API key") || profile.summary.includes("unavailable")) && (
          <ErrorAlert error={profile.summary} />
        )}

        {/* 2. Candidate Profile Review and Search Preference Settings */}
        {step === "done" && profile && (
          <div className="glass-card animate-fadeInUp" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "linear-gradient(180deg, #ffffff 0%, #71717a 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: "#09090b", fontWeight: 800
                }}>
                  {profile.name?.[0] || "✓"}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa" }}>{profile.name}</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{profile.email || ""}</p>
                </div>
              </div>

              <div style={{
                padding: "4px 10px", borderRadius: 6,
                background: "rgba(255, 255, 255, 0.08)", color: "#e4e4e7",
                border: "1px solid rgba(255, 255, 255, 0.15)", fontSize: 12, fontWeight: 700
              }}>
                {profile.level?.toUpperCase() || "MID"}
              </div>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>
              {profile.summary}
            </p>

            {/* Skills & Domains */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  {t("upload.skillsCount")} ({profile.skills?.length || 0})
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {profile.skills?.slice(0, 10).map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  {t("upload.domains")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {profile.domains?.map((domain, i) => (
                    <span key={i} className="skill-tag" style={{ color: "#fafafa" }}>{domain}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Natural Language Preferences */}
            <div style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 24
            }}>
              <div style={{
                marginBottom: 24, padding: 20, borderRadius: 12,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", display: "block", marginBottom: 6 }}>
                  {t("pref.title")}
                </label>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                  {t("pref.desc")}
                </p>
                <textarea
                  className="input-field"
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={t("pref.placeholder")}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Location presets including Offline Korea & Jeonju */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", display: "block", marginBottom: 8 }}>
                  {t("pref.location")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Korea, Jeonju, Seoul, Remote..."
                  style={{ marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: t("pref.locKorea"), val: "Korea" },
                    { label: t("pref.locJeonju"), val: "Jeonju" },
                    { label: t("pref.locSeoul"), val: "Seoul" },
                    { label: t("pref.locRemote"), val: "Remote" },
                    { label: t("pref.locWorldwide"), val: "Worldwide" },
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLocation(preset.val)}
                      style={{
                        fontSize: 12, padding: "5px 12px", borderRadius: 8,
                        background: location === preset.val ? "#ffffff" : "rgba(255, 255, 255, 0.04)",
                        color: location === preset.val ? "#09090b" : "#a1a1aa",
                        fontWeight: location === preset.val ? 700 : 500,
                        border: location === preset.val ? "1px solid #ffffff" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer", transition: "all 0.15s ease"
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
                <button
                  type="button"
                  onClick={() => {
                    setProfile(null);
                    setStep("idle");
                  }}
                  className="btn-secondary"
                  style={{ padding: "10px 20px" }}
                >
                  {t("upload.useSavedBack")}
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="btn-primary"
                  style={{ padding: "14px 36px", fontSize: 15 }}
                >
                  {t("pref.searchBtn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
