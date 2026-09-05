"use client";

import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";

interface NavbarProps {
  currentStep?: number;
}

export default function Navbar({ currentStep }: NavbarProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <nav className="navbar" style={{ padding: "0 24px" }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", display: "flex",
        alignItems: "center", justifyContent: "space-between", height: 64
      }}>
        {/* Brand */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(180deg, #ffffff 0%, #71717a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#09090b",
            boxShadow: "0 2px 8px rgba(255,255,255,0.15)"
          }}>
            D
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.02em" }}>
              {t("nav.logo")}
            </span>
          </div>
        </Link>

        {/* Step Indicators (if specified) */}
        {currentStep !== undefined && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[t("nav.step1"), t("nav.step2"), t("nav.step3")].map((label, i) => {
              const isActive = i + 1 === currentStep;
              const isDone = i + 1 < currentStep;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: isDone ? "#ffffff" : isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                    color: isDone ? "#09090b" : isActive ? "#ffffff" : "#71717a",
                    border: isActive ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700
                  }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: isActive ? "#fafafa" : "#71717a",
                    fontWeight: isActive ? 600 : 400
                  }}>
                    {label}
                  </span>
                  {i < 2 && <span style={{ color: "#3f3f46", margin: "0 2px" }}>›</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Right tools: Admin Sources + Language Toggle + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Admin Sources Link */}
          <Link
            href="/admin/sources"
            className="btn-secondary"
            style={{
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
              textDecoration: "none",
            }}
            title={language === "ko" ? "크롤러 소스 및 우선순위 모니터 (관리자 전용)" : "Crawler Sources & Priorities (Admin Only)"}
          >
            <span>⚙️</span>
            <span>{language === "ko" ? "크롤러 소스" : "Sources"}</span>
          </Link>

          {/* Language Toggle */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 20,
            padding: "3px 4px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <button
              onClick={() => setLanguage("en")}
              style={{
                padding: "3px 10px",
                borderRadius: 14,
                fontSize: 11,
                fontWeight: 700,
                background: language === "en" ? "#ffffff" : "transparent",
                color: language === "en" ? "#09090b" : "#a1a1aa",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title="Switch to English"
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("ko")}
              style={{
                padding: "3px 10px",
                borderRadius: 14,
                fontSize: 11,
                fontWeight: 700,
                background: language === "ko" ? "#ffffff" : "transparent",
                color: language === "ko" ? "#09090b" : "#a1a1aa",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title="한국어로 변경"
            >
              KO
            </button>
          </div>

          <Link
            href="/upload"
            className="btn-primary"
            style={{ padding: "8px 18px", fontSize: 13 }}
          >
            {t("nav.startBtn")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
