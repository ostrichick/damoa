"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { value: "98%", label: "매칭 정확도" },
    { value: "50,000+", label: "분석된 공고" },
    { value: "3분", label: "평균 분석 시간" },
    { value: "AI 기반", label: "맞춤 추천" },
  ];

  const features = [
    {
      icon: (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75m0-3H12m-.75 3h.008v.008H11.25v-.008zm0-6h.008v.008H11.25v-.008zm0-3h.008v.008H11.25v-.008z" />
        </svg>
      ),
      title: "이력서 자동 분석",
      desc: "PDF, DOCX 이력서를 업로드하면 AI가 스킬, 경력, 학력을 자동으로 추출합니다.",
      color: "purple",
    },
    {
      icon: (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
      title: "LinkedIn 연동",
      desc: "LinkedIn 프로필 URL을 입력하면 공개 정보를 자동으로 가져와 분석합니다.",
      color: "cyan",
    },
    {
      icon: (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803M10.5 7.5v6m3-3H7.5" />
        </svg>
      ),
      title: "실시간 공고 수집",
      desc: "LinkedIn Jobs 등 주요 채용 사이트에서 최신 공고를 실시간으로 크롤링합니다.",
      color: "green",
    },
    {
      icon: (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
      title: "AI 적합도 분석",
      desc: "Gemini AI가 스킬, 경력, 도메인을 종합적으로 분석해 최적의 공고를 추천합니다.",
      color: "orange",
    },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <nav className="navbar" style={{ padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "white"
            }}>D</div>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
              <span className="gradient-text">다모아</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/upload" className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
              지금 시작하기 →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px 60px" }}>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
          {/* Badge */}
          <div className="animate-fadeInUp" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 100,
            background: "rgba(124, 58, 237, 0.1)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            marginBottom: 28, fontSize: 13, fontWeight: 500, color: "#a78bfa"
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", display: "inline-block", animation: "pulse 2s infinite" }} />
            Gemini AI 기반 스마트 채용 매칭
          </div>

          <h1
            className="animate-fadeInUp animate-delay-1"
            style={{
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              fontFamily: "Outfit, sans-serif",
              marginBottom: 24,
            }}
          >
            당신의 이력서로<br />
            <span className="gradient-text">완벽한 직장</span>을 찾아드립니다
          </h1>

          <p
            className="animate-fadeInUp animate-delay-2"
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              marginBottom: 40,
            }}
          >
            이력서를 업로드하거나 LinkedIn 프로필을 연결하세요.<br />
            AI가 당신의 역량을 분석해 수천 개의 공고 중 가장 잘 맞는 것을 찾아드립니다.
          </p>

          <div className="animate-fadeInUp animate-delay-3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/upload" className="btn-primary animate-pulse-glow" style={{ fontSize: 16, padding: "16px 36px" }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              이력서 업로드하기
            </Link>
            <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 16, padding: "16px 36px" }}>
              작동 방식 보기
            </a>
          </div>
        </div>

        {/* Stats */}
        <div
          className="animate-fadeInUp animate-delay-4"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginTop: 80,
          }}
        >
          {stats.map((stat, i) => (
            <div key={i} className="glass-card" style={{ padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
                <span className="gradient-text">{stat.value}</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, fontFamily: "Outfit, sans-serif", marginBottom: 16 }}>
            어떻게 <span className="gradient-text">작동하나요</span>?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>3단계로 완성되는 AI 채용 매칭</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            {
              step: "01",
              title: "이력서 입력",
              desc: "PDF/DOCX 이력서를 업로드하거나 LinkedIn 프로필 URL을 입력합니다.",
              icon: "📄",
            },
            {
              step: "02",
              title: "AI 분석",
              desc: "Gemini AI가 스킬, 경력, 학력, 도메인을 자동으로 추출하고 프로필을 생성합니다.",
              icon: "🤖",
            },
            {
              step: "03",
              title: "맞춤 추천",
              desc: "수집된 채용 공고와 당신의 프로필을 비교해 적합도 점수와 함께 추천합니다.",
              icon: "🎯",
            },
          ].map((item, i) => (
            <div key={i} className="glass-card" style={{ padding: 32, position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: -10, right: -10,
                fontSize: 80, opacity: 0.06, fontFamily: "Outfit, sans-serif",
                fontWeight: 900, color: "white", lineHeight: 1
              }}>
                {item.step}
              </div>
              <div style={{ fontSize: 40, marginBottom: 20 }}>{item.icon}</div>
              <div style={{
                display: "inline-block",
                padding: "3px 10px",
                background: "rgba(124,58,237,0.15)",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: "#a78bfa",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}>
                STEP {item.step}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{item.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 15 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, fontFamily: "Outfit, sans-serif", marginBottom: 16 }}>
            강력한 <span className="gradient-text">핵심 기능</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {features.map((feature, i) => {
            const colorMap: Record<string, string> = {
              purple: "#7c3aed",
              cyan: "#06b6d4",
              green: "#10b981",
              orange: "#f59e0b",
            };
            const c = colorMap[feature.color];
            return (
              <div key={i} className="glass-card" style={{ padding: 28, display: "flex", gap: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `rgba(${c === "#7c3aed" ? "124,58,237" : c === "#06b6d4" ? "6,182,212" : c === "#10b981" ? "16,185,129" : "245,158,11"}, 0.12)`,
                  border: `1px solid ${c}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: c, flexShrink: 0,
                }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{feature.title}</h3>
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 14 }}>{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px 100px" }}>
        <div
          className="glass-card"
          style={{
            padding: "64px 48px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.08) 100%)",
            border: "1px solid rgba(124,58,237,0.25)",
          }}
        >
          <h2 style={{ fontSize: 40, fontWeight: 900, fontFamily: "Outfit, sans-serif", marginBottom: 16 }}>
            지금 바로 <span className="gradient-text">시작하세요</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 17, marginBottom: 36, lineHeight: 1.7 }}>
            무료로 이력서를 분석하고 맞춤 채용 공고를 받아보세요.<br />
            회원가입 없이 바로 사용할 수 있습니다.
          </p>
          <Link href="/upload" className="btn-primary animate-pulse-glow" style={{ fontSize: 16, padding: "18px 48px" }}>
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "32px 24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: 14,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <span style={{ fontWeight: 700 }}>다모아 (Damoa)</span> — AI 기반 채용 공고 추천 서비스 &nbsp;·&nbsp; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
