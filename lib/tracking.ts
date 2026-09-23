/**
 * 광고 매체 전환 신호.
 *
 * 전화 클릭 · 카카오톡 상담 · 견적 접수가 일어났다는 사실을 광고 매체에 알린다.
 * 이걸 보내지 않으면 매체의 자동 최적화가 "어떤 클릭이 쓸모 있었는지"를 배우지 못한다.
 *
 * **ID 가 비어 있으면 스크립트를 아예 내보내지 않는다.** 아직 픽셀을 만들지 않았어도
 * 배포에 아무 영향이 없고, 나중에 환경변수만 채우면 켜진다.
 */

/** 메타 픽셀 ID. 비즈니스 관리자 → 이벤트 관리자에서 엔엠솔루션 전용으로 만든다. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''

/** 네이버 프리미엄 로그분석 계정 ID (`wcs_add["wa"]` 에 넣는 값). */
export const NAVER_WCS_ID = process.env.NEXT_PUBLIC_NAVER_WCS_ID ?? ''

/**
 * 네이버 전환 유형 코드.
 *
 * 프리미엄 로그분석의 "전환 유형"에 따라 숫자가 다르다. **광고주 계정에서 실제 코드를
 * 확인해 환경변수로 맞춘다.** 확인 전까지는 아래 기본값으로 나가므로, 네이버 쪽 보고서의
 * 전환 유형 이름이 기대와 다르면 이 값을 고친다.
 */
export const NAVER_CONV_TYPE = {
  quote: process.env.NEXT_PUBLIC_NAVER_CONV_TYPE_QUOTE ?? '2',
  contact: process.env.NEXT_PUBLIC_NAVER_CONV_TYPE_CONTACT ?? '3',
} as const

export type ConversionKind = 'quote' | 'contact'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    wcs?: { cnv: (type: string, value: string) => string; inflow: (host?: string) => void }
    wcs_do?: (data?: Record<string, string>) => void
    wcs_add?: Record<string, string>
  }
}

/**
 * 전환 1건을 메타와 네이버에 알린다.
 *
 * Vercel Analytics 의 `track()` 은 사람이 눈으로 보는 용도라 매체로 넘어가지 않는다.
 * 기존 `track()` 호출은 그대로 두고 이 함수를 나란히 부른다.
 */
export function reportConversion(kind: ConversionKind, detail: Record<string, string> = {}) {
  if (typeof window === 'undefined') return

  // 메타 — 전화·카톡·견적 모두 잠재고객(Lead)으로 본다. 어느 쪽인지는 파라미터로 구분한다.
  try {
    window.fbq?.('track', 'Lead', { content_name: kind, ...detail })
  } catch {
    // 픽셀이 차단됐을 뿐이다. 접수 자체를 막지 않는다.
  }

  // 네이버 — wcs.cnv 로 전환 유형을 지정한 뒤 wcs_do 로 전송한다
  try {
    if (window.wcs && window.wcs_do) {
      const nasa: Record<string, string> = { cnv: window.wcs.cnv(NAVER_CONV_TYPE[kind], '1') }
      window.wcs_do(nasa)
    }
  } catch {
    // 위와 같다
  }
}
