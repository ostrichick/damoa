"use client";

import { useState } from "react";
import { parsePipelineError, ParsedPipelineError } from "../utils/errorParser";
import { useLanguage } from "../context/LanguageContext";

interface ErrorAlertProps {
  error: unknown;
  onRetry?: () => void;
  style?: React.CSSProperties;
}

export default function ErrorAlert({ error, onRetry, style }: ErrorAlertProps) {
  const { language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const parsed: ParsedPipelineError = parsePipelineError(error, language);

  return (
    <div
      className="glass-card animate-fadeInUp"
      style={{
        padding: "20px 24px",
        borderRadius: 12,
        background: "rgba(239, 68, 68, 0.04)",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        marginBottom: 20,
        ...style,
      }}
    >
      {/* Top row: Step Badge & Title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
            background: "rgba(239, 68, 68, 0.15)", color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.3)", letterSpacing: "0.04em"
          }}>
            {parsed.stepCode}
          </span>
          <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 600 }}>
            {parsed.stepName}
          </span>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-secondary"
            style={{ padding: "4px 10px", fontSize: 11, borderColor: "rgba(239, 68, 68, 0.3)" }}
          >
            🔄 {language === "ko" ? "다시 시도" : "Retry"}
          </button>
        )}
      </div>

      {/* Error Title */}
      <h4 style={{ fontSize: 16, fontWeight: 700, color: "#fca5a5", marginBottom: 6 }}>
        ⚠️ {parsed.title}
      </h4>

      {/* Explanation */}
      <p style={{ fontSize: 13, color: "#e4e4e7", lineHeight: 1.5, marginBottom: 10 }}>
        {parsed.description}
      </p>

      {/* Suggested Action Box */}
      <div style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: "rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        fontSize: 12,
        color: "#d4d4d8",
        lineHeight: 1.5,
      }}>
        <strong style={{ color: "#ffffff" }}>💡 {language === "ko" ? "해결 방법:" : "How to Fix:"} </strong>
        {parsed.suggestedAction}
      </div>

      {/* Raw detail toggler (for developers/admins) */}
      {parsed.raw && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: "transparent",
              border: "none",
              color: "#71717a",
              fontSize: 11,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {showDetails
              ? (language === "ko" ? "▲ 기술 로그 접기" : "▲ Hide Technical Log")
              : (language === "ko" ? "▼ 상세 기술 로그 확인 (관리자용)" : "▼ Show Technical Log (For Admin)")}
          </button>

          {showDetails && (
            <pre style={{
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 6,
              background: "#09090b",
              color: "#a1a1aa",
              fontSize: 11,
              fontFamily: "monospace",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}>
              {parsed.raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
