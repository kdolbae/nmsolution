/** 견적 문의 폼에서 고를 수 있는 공종. 개보수 범위와 같은 기준으로 맞춘다. */
export const QUOTE_CATEGORIES = [
  '철골 · 지붕 · 벽체',
  '배관 · 탱크 · 용접',
  '바닥 · 단열 · 도장',
  '크린룸 · 방음 · 흡음',
  '장비 수리',
  '누수 · 피해복구',
  '기타 · 모르겠음',
] as const

export const QUOTE_STATUSES = [
  { value: 'new', label: '접수' },
  { value: 'contacted', label: '연락함' },
  { value: 'done', label: '완료' },
] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]['value']

export function statusLabel(value: string): string {
  return QUOTE_STATUSES.find((s) => s.value === value)?.label ?? value
}
