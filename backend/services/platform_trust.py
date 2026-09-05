"""
Platform Trust & Payment Information Database
Provides reliability ratings, payment methods, and payout cycles for global AI remote job platforms.
"""

from __future__ import annotations

from typing import Any

# Known platform trust database
PLATFORM_TRUST_DB: dict[str, dict[str, Any]] = {
    "outlier": {
        "name": "Outlier.ai (Scale AI)",
        "rating": "HIGH",
        "badge": "🟢 검증된 플랫폼",
        "risk_level": "낮음",
        "payment_methods": ["PayPal", "AirTM"],
        "payment_cycle": "매주 화요일 자동 정산",
        "summary": "Scale AI의 자회사로 한국어 LLM 평가 및 AI 프롬프트 트레이너에게 정시 지불이 보증된 우수 플랫폼입니다.",
    },
    "dataannotation": {
        "name": "DataAnnotation.tech",
        "rating": "HIGH",
        "badge": "🟢 검증된 플랫폼",
        "risk_level": "낮음",
        "payment_methods": ["PayPal"],
        "payment_cycle": "작업 승인 후 3일 이내 (자유 출금)",
        "summary": "글로벌 최고의 AI 데이터 라벨링 플랫폼으로 시급($20~$40)이 높고 페이팔 지불이 매우 신속합니다.",
    },
    "oneforma": {
        "name": "OneForma (Centific)",
        "rating": "HIGH",
        "badge": "🟢 검증된 플랫폼",
        "risk_level": "낮음",
        "payment_methods": ["Payoneer", "PayPal"],
        "payment_cycle": "매월 15일~25일 일괄 지불",
        "summary": "글로벌 AI 데이터 기업 Centific 운영. 한국어 텍스트/음성/AI 평가 프로젝트가 다양하고 정기 지불됩니다.",
    },
    "appen": {
        "name": "Appen",
        "rating": "HIGH",
        "badge": "🟢 상장사 (검증됨)",
        "risk_level": "낮음",
        "payment_methods": ["Payoneer", "Direct Bank Deposit"],
        "payment_cycle": "매월 1회 (익월 15일 경)",
        "summary": "호주 증시 상장 기업. 한국어 검색 평가 및 AI 학습 데이터 수집 분야의 대표적 대형 플랫폼입니다.",
    },
    "telus": {
        "name": "TELUS International",
        "rating": "HIGH",
        "badge": "🟢 상장사 (검증됨)",
        "risk_level": "낮음",
        "payment_methods": ["Hyperwallet", "은행 직통 입금"],
        "payment_cycle": "매월 1회 정기 송금",
        "summary": "캐나다 통신 대기업 TELUS 자회사로 대금 체불 위험이 없으며 통장 직접 입금을 지원합니다.",
    },
    "rws": {
        "name": "RWS Group (Moravia)",
        "rating": "HIGH",
        "badge": "🟢 검증된 기업",
        "risk_level": "낮음",
        "payment_methods": ["SWIFT/IBAN 해외 은행 송금", "Payoneer"],
        "payment_cycle": "익월 말일 30일 대금 지급",
        "summary": "영국 상장 글로벌 번역/AI 데이터 기업. 한국인 언어 평가사 및 데이터 검수자에 국내 은행 입금을 보장합니다.",
    },
    "remotasks": {
        "name": "Remotasks",
        "rating": "MEDIUM",
        "badge": "🟡 주의 필요 (물량 변동)",
        "risk_level": "보통",
        "payment_methods": ["PayPal", "AirTM"],
        "payment_cycle": "매주 목요일 지급",
        "summary": "지불은 정상 처리되나 작업 계정 락다운 및 물량 변동 폭이 크므로 서브 플랫폼으로 활용 권장합니다.",
    },
    "upwork": {
        "name": "Upwork",
        "rating": "HIGH",
        "badge": "🟢 에스크로 안전 보장",
        "risk_level": "낮음",
        "payment_methods": ["PayPal", "Payoneer", "국내 은행 직통 입금 (Wire)"],
        "payment_cycle": "클라이언트 승인 후 즉시 출금 가능",
        "summary": "세계 최대 프리랜스 플랫폼. 에스크로(결제 대금 예치) 시스템으로 작업 후 대금 떼일 위험이 없습니다.",
    },
    "linkedin": {
        "name": "LinkedIn Direct Job",
        "rating": "HIGH",
        "badge": "🟢 정식 기업 직채용",
        "risk_level": "낮음",
        "payment_methods": ["국내/해외 통장 직접 입금", "Wise", "Deel"],
        "payment_cycle": "월급 (매월 지정일)",
        "summary": "링크드인 정식 등록 기업의 직접 채용으로 정식 근로/프리랜서 계약서를 작성하고 통장 입금됩니다.",
    },
}

DEFAULT_TRUST_INFO = {
    "name": "기업 직접 채용 / 정식 원격 플랫폼",
    "rating": "HIGH",
    "badge": "🟢 정식 채용 공고",
    "risk_level": "낮음",
    "payment_methods": ["통장 직접 입금", "PayPal", "Wise"],
    "payment_cycle": "월급 / 계약서 기준",
    "summary": "정식 기업 공고로 표준 계약 절차를 거쳐 지정 계좌로 급여가 지급됩니다.",
}


def get_platform_trust_info(company_name: str, platform_name: str, url: str) -> dict[str, Any]:
    """
    Look up or analyze the reliability and payment methods for a job post.
    """
    text = (company_name + " " + platform_name + " " + url).lower()

    for key, info in PLATFORM_TRUST_DB.items():
        if key in text:
            return info

    return DEFAULT_TRUST_INFO
