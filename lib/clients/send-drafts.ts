import { SUPPLIER, type Quote } from './quote'

/**
 * 업체에 보낼 견적 안내 문자·메일 초안. 금액·범위는 넣지 않고 업체용 링크와 비밀번호만 안내한다(2026-10-28 kevin).
 * 링크로 열어야 열람 기록이 남으므로 PDF 를 따로 붙이지 않는다.
 */
export type QuoteDrafts = { sms: string; mailSubject: string; mailText: string }

export function quoteDrafts(c: { name: string; contactPerson?: string | null; portalSlug: string }, quote: Pick<Quote, 'title'>, password: string): QuoteDrafts {
  const title = quote.title.trim() || '공사'
  const link = `https://nm-solution.co.kr/${c.portalSlug}`
  const pw = password.trim()
  const access = [`▶ 견적 보기: ${link}`, ...(pw ? [`▶ 비밀번호: ${pw}`] : [])]
  const sms = [
    `[엔엠솔루션] ${c.name} 견적 안내`,
    '',
    '안녕하세요, 엔엠솔루션입니다.',
    `${title} 견적서를 보내드립니다.`,
    '',
    ...access,
    '',
    '페이지에서 현장 사진, 공정, 세부 내역을 확인하실 수 있고 PDF로도 받으실 수 있습니다.',
    '궁금하신 점은 편하게 연락 주세요.',
    '',
    `엔엠솔루션 ${SUPPLIER.ceo}`,
    `${SUPPLIER.phoneMobile} / ${SUPPLIER.phoneMain}`,
  ].join('\n')
  const to = c.contactPerson?.trim() ? `${c.name} ${c.contactPerson.trim()}님께,` : `${c.name} 담당자님께,`
  const mailText = [
    to,
    '',
    `안녕하세요, 엔엠솔루션 ${SUPPLIER.ceo}입니다.`,
    `요청하신 ${title} 견적서를 보내드립니다.`,
    '',
    '아래 링크에서 현장 사진, 공정, 세부 견적 내역을 확인하실 수 있으며, 페이지에서 PDF로도 내려받으실 수 있습니다.',
    '',
    ...access,
    '',
    '검토 후 궁금하신 점이나 조정이 필요한 부분이 있으면 편하게 연락 주십시오.',
    '감사합니다.',
    '',
    `엔엠솔루션(NM SOLUTION) 대표 ${SUPPLIER.ceo}`,
    SUPPLIER.address,
    `대표 ${SUPPLIER.phoneMain} / 직통 ${SUPPLIER.phoneMobile}`,
    SUPPLIER.web,
  ].join('\n')
  return { sms, mailSubject: `[엔엠솔루션] ${title} 견적서 송부`, mailText }
}
