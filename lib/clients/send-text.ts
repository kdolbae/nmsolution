import { SUPPLIER } from './quote'

/**
 * 견적서 발송 문자 문안 (모든 업체 공통, 2026-11-05 kevin).
 * - 링크는 nm-solution.co.kr 업체 페이지만 넣는다. 그 주소로 열어야 접속·행동 기록이 남는다(프로젝트 1순위 규칙).
 *   PDF 첨부·다른 주소는 넣지 않는다.
 * - 금액·원가·내부 출처는 넣지 않는다(2026-10-28 결정: 링크·비밀번호만 안내).
 * - 비밀번호는 문자에 같이 넣는다(2026-11-05 kevin). DB 에 해시로만 있어 자동으로 못 채우므로 어드민이 입력한 값을 넣고, 저장하지 않는다.
 * - 고객용 문안은 존댓말(2026-11-05 kevin).
 */
export type SendTextStyle = 'full' | 'short'

export type SendTextInput = {
  clientName: string
  contactPerson?: string | null
  portalSlug: string
  /** 견적서 제목 (공사명) */
  title?: string | null
  /** 견적번호 (NM-YYMM-순번) */
  number?: string | null
  /** 비우면 비밀번호 줄을 '별도 안내' 로 둔다 */
  password?: string | null
  style?: SendTextStyle
}

export function clientPageUrl(slug: string) {
  return `https://nm-solution.co.kr/${slug.replace(/^\/+/, '')}`
}

export function quoteSendText(i: SendTextInput): string {
  const title = (i.title ?? '').trim() || '공사'
  const num = (i.number ?? '').trim()
  const pw = (i.password ?? '').trim()
  const who = (i.contactPerson ?? '').trim()
  const link = clientPageUrl(i.portalSlug)
  const pwLine = `▶ 비밀번호: ${pw || '별도 안내'}`

  if (i.style === 'short') {
    return [
      `[엔엠솔루션] ${title} 견적서를 보내드립니다.`,
      `▶ 견적 보기: ${link}`,
      pwLine,
      `궁금하신 점은 ${SUPPLIER.phoneMobile}로 연락 주세요.`,
    ].join('\n')
  }

  return [
    `[엔엠솔루션] ${i.clientName} 견적 안내`,
    '',
    `안녕하세요${who ? `, ${who}님` : ''}. 엔엠솔루션입니다.`,
    `${title} 견적서${num ? `(${num})` : ''}를 보내드립니다.`,
    '',
    `▶ 견적 보기: ${link}`,
    pwLine,
    '',
    '페이지에서 공사 내용과 세부 내역을 확인하실 수 있고 PDF로도 받으실 수 있습니다.',
    '궁금하신 점은 편하게 연락 주세요.',
    '',
    `엔엠솔루션 ${SUPPLIER.ceo}`,
    `${SUPPLIER.phoneMobile} / ${SUPPLIER.phoneMain}`,
  ].join('\n')
}

/** 휴대폰 문자 앱을 여는 sms: 주소. 받는 번호는 숫자만 남긴다 */
export function smsHref(phone: string | null | undefined, body: string) {
  const to = String(phone ?? '').replace(/[^\d+]/g, '')
  return `sms:${to}?&body=${encodeURIComponent(body)}`
}
