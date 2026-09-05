"use client";

import Link from "next/link";
import Navbar from "./components/Navbar";
import { useLanguage } from "./context/LanguageContext";

export default function HomePage() {
  const { t } = useLanguage();

  const stats = [
    { value: t("stats.accuracy"), label: t("stats.accuracyLabel") },
    { value: t("stats.jobs"), label: t("stats.jobsLabel") },
    { value: t("stats.time"), label: t("stats.timeLabel") },
    { value: t("stats.ai"), label: t("stats.aiLabel") },
  ];

  const features = [
    {
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75m0-3H12m-.75 3h.008v.008H11.25v-.008zm0-6h.008v.008H11.25v-.008zm0-3h.008v.008H11.25v-.008z" />
        </svg>
      ),
      title: t("feat.f1.title"),
      desc: t("feat.f1.desc"),
    },
    {
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
      title: t("feat.f2.title"),
      desc: t("feat.f2.desc"),
    },
    {
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: t("feat.f3.title"),
      desc: t("feat.f3.desc"),
    },
    {
      icon: (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
      title: t("feat.f4.title"),
      desc: t("feat.f4.desc"),
    },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "100px 24px 60px" }}>
        <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
          <div
            className="animate-fadeInUp"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 100,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              marginBottom: 28,
              fontSize: 13,
              fontWeight: 500,
              color: "#d4d4d8",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#ffffff",
                display: "inline-block",
              }}
            />
            {t("hero.badge")}
          </div>

          <h1
            className="animate-fadeInUp animate-delay-1"
            style={{
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: 24,
            }}
          >
            {t("hero.titleLine1")}<br />
            <span className="gradient-text">{t("hero.titleHighlight")}</span>
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
            {t("hero.desc")}
          </p>

          <div
            className="animate-fadeInUp animate-delay-3"
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link
              href="/upload"
              className="btn-primary"
              style={{ fontSize: 15, padding: "14px 32px" }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {t("hero.uploadBtn")}
            </Link>
            <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 15, padding: "14px 28px" }}>
              {t("hero.howItWorksBtn")}
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
            <div key={i} className="glass-card" style={{ padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>
            {t("how.title")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            {t("how.subtitle")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { step: "01", title: t("how.step1.title"), desc: t("how.step1.desc") },
            { step: "02", title: t("how.step2.title"), desc: t("how.step2.desc") },
            { step: "03", title: t("how.step3.title"), desc: t("how.step3.desc") },
          ].map((item, i) => (
            <div key={i} className="glass-card" style={{ padding: 32, position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: -10, right: 10,
                fontSize: 72, opacity: 0.04, fontWeight: 900, color: "#ffffff", lineHeight: 1
              }}>
                {item.step}
              </div>
              <div style={{
                display: "inline-block", padding: "4px 10px",
                background: "rgba(255,255,255,0.06)", borderRadius: 6,
                fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: "0.06em", marginBottom: 16
              }}>
                STEP {item.step}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", marginBottom: 10 }}>{item.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, fontSize: 14 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Capabilities */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>
            {t("feat.title")}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {features.map((feat, i) => (
            <div key={i} className="glass-card" style={{ padding: 28, display: "flex", gap: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#ffffff", flexShrink: 0
              }}>
                {feat.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fafafa", marginBottom: 6 }}>{feat.title}</h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: 14 }}>{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 100px" }}>
        <div className="glass-card" style={{
          padding: "56px 40px", textAlign: "center",
          background: "linear-gradient(180deg, rgba(24, 24, 27, 0.8) 0%, rgba(18, 18, 20, 0.9) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)"
        }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14, color: "#fafafa" }}>
            {t("cta.title")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
            {t("cta.desc")}
          </p>
          <Link href="/upload" className="btn-primary" style={{ fontSize: 15, padding: "14px 40px" }}>
            {t("cta.btn")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "28px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {t("footer.text")}
        </div>
      </footer>
    </div>
  );
}
