/**
 * 수주·실주 기록 (2026-11-14 kevin): 견적마다 계약이 됐는지 안 됐는지, 왜 그랬는지를 남긴다.
 * 어드민 전용이고 고객 화면에는 나오지 않는다. 브라우저·서버 양쪽에서 쓴다.
 *
 * 견적(업체 한 건)마다 결과 하나. 고치면 이전 기록은 history 에 쌓인다.
 * 기록할 때의 공급가·영업이익률·공종을 같이 남겨, 나중에 "어느 공종이 어떤 이유로 떨어지는지"를 모아 본다.
 */
export const OUTCOME_RESULTS = ['won', 'lost', 'hold'] as const
export type OutcomeResult = (typeof OUTCOME_RESULTS)[number]

export const RESULT_LABEL: Record<OutcomeResult, string> = { won: '수주', lost: '실주', hold: '보류' }

/** 고르는 이유. 여러 개 고를 수 있고, 자세한 사정은 메모에 적는다 */
export const OUTCOME_REASONS: Record<OutcomeResult, string[]> = {
  won: ['가격이 맞음', '대응이 빠름', '제안서·자료가 충실함', '현장 이해·기술 설명', '소개·기존 거래', '일정을 맞춤', '기타'],
  lost: ['가격이 높음', '다른 업체로 결정', '대응·견적이 늦음', '공사 범위·사양이 안 맞음', '실적·신뢰 부족', '일정이 안 맞음', '이유 모름 (연락 없음)', '기타'],
  hold: ['고객 예산 부족', '고객 사업·일정 보류', '고객 내부 결재 대기', '직접 시공으로 변경', '기타'],
}

export type OutcomeRevision = { at: string; by: string; result: OutcomeResult; reasons: string[]; note: string }

export type Outcome = {
  clientId: number
  clientName: string
  /** 견적번호 */
  number: string
  result: OutcomeResult
  reasons: string[]
  note: string
  /** 고객이 말한 다른 업체 금액 (공급가, 알 때만) */
  rivalPrice: number | null
  /** 기록할 때의 공급가 */
  supply: number
  /** 기록할 때의 영업이익률 (%) */
  rate: number | null
  /** 기록할 때 견적 공종의 카테고리 중분류 코드 (F1 ~ H4) */
  categories: string[]
  by: string
  at: string
  history: OutcomeRevision[]
}

export type ReasonCount = { reason: string; count: number }

/** 결과별로 이유가 몇 번 나왔는지 (많은 순) */
export function countReasons(list: Outcome[], result: OutcomeResult): ReasonCount[] {
  const m = new Map<string, number>()
  for (const o of list) if (o.result === result) for (const r of o.reasons) m.set(r, (m.get(r) ?? 0) + 1)
  return [...m].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)
}

/** 수주율 = 수주 ÷ (수주 + 실주). 보류는 뺀다 */
export function winRate(list: Outcome[]): { won: number; lost: number; hold: number; rate: number | null } {
  const n = (r: OutcomeResult) => list.filter((o) => o.result === r).length
  const won = n('won')
  const lost = n('lost')
  return { won, lost, hold: n('hold'), rate: won + lost ? (won / (won + lost)) * 100 : null }
}
