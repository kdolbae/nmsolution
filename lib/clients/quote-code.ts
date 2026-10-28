/**
 * 고객 발송 견적번호 (2026-10-28 kevin): 업체 영문 이니셜 - NM견적연월 - 공종 코드 - 그 달 순번 (예: ATK-NM2610-MECH-04).
 * 같은 견적서를 다시 보내면 -R1, -R2 를 붙인다. 이미 고객에게 나간 번호는 바꾸지 않는다.
 * 공종 코드는 공사 카테고리(/mnt/project-files/work-categories/categories.json) 중분류 코드를 짧게 쓴 것.
 * 브라우저·서버 양쪽에서 쓴다.
 */

export const WORK_CODES: { code: string; name: string }[] = [
  { code: 'ROOF', name: '지붕·외벽' },
  { code: 'PANEL', name: '판넬 내장·칸막이' },
  { code: 'STEEL', name: '철골·구조물' },
  { code: 'HEAVY', name: '중량물 이동·안착' },
  { code: 'WELD', name: '용접·제관' },
  { code: 'MECH', name: '기계설비·배관' },
  { code: 'ELEC', name: '전기' },
  { code: 'FLOOR', name: '바닥·도장' },
  { code: 'DEMO', name: '철거·폐기물' },
  { code: 'LEAK', name: '누수 피해복구' },
  { code: 'NANO', name: '나노 코팅' },
  { code: 'GROUT', name: '줄눈' },
  { code: 'ELASTIC', name: '탄성코트' },
  { code: 'CLEAN', name: '스케일링·오염 제거' },
]

/** 업체 이니셜: 영문 대문자·숫자 2~6자 */
export function cleanClientCode(v: unknown): string {
  return String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

export function cleanWorkCode(v: unknown): string {
  const s = String(v ?? '').toUpperCase()
  return WORK_CODES.some((w) => w.code === s) ? s : ''
}

/**
 * 발송 견적번호의 바탕(발송 차수 붙이기 전).
 * 순번은 지금 견적서 번호(NM-2610-04 같은 꼴)의 끝 숫자를 그대로 쓰고, 없으면 01.
 */
export function quoteCodeNumber(clientCode: string, workCode: string, quote: { number: string; date: string }): string {
  const ym = /^\d{4}-\d{2}/.test(quote.date) ? `${quote.date.slice(2, 4)}${quote.date.slice(5, 7)}` : ''
  const seq = quote.number.match(/(\d{1,3})\s*$/)?.[1]?.padStart(2, '0') ?? '01'
  return `${clientCode}-NM${ym}-${workCode}-${seq}`
}
