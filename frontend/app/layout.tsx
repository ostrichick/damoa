import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다모아 (Damoa) - AI 이력서 기반 채용 공고 추천",
  description:
    "이력서를 업로드하거나 LinkedIn 프로필을 연결하면 AI가 분석해서 당신에게 딱 맞는 채용 공고를 적합도 순으로 추천해드립니다.",
  keywords: ["채용", "이력서", "AI", "잡매칭", "취업", "LinkedIn", "job recommendation"],
  openGraph: {
    title: "다모아 (Damoa) - AI 채용 공고 추천",
    description: "AI가 당신의 이력서를 분석해 최적의 채용 공고를 찾아드립니다",
    type: "website",
  },
};

import { LanguageProvider } from "./context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="bg-canvas" aria-hidden="true" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </div>
      </body>
    </html>
  );
}
