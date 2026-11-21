/**
 * 기술 자료 (2026-11-15 kevin): 이음 방식·공법·자재마다 기술 카드를 쌓고, 같은 목적의 대안을 비교 세트로 묶는다.
 * 견적을 쓸 때 공종을 고르면 '방식 고르기' 단계에 비교표가 뜨고, 고른 방식과 이유가 견적에 남는다.
 * 어드민 전용이고 고객 화면에는 나오지 않는다. 브라우저·서버 양쪽에서 쓴다.
 *
 * 수치(압력·온도·관경 등)는 출처가 있을 때만 figures 에 적는다. 출처 없이 아는 내용은 status '미확인'으로 둔다.
 */
export const TECH_STATUS = ['확인됨', '현장 경험', '미확인'] as const
export type TechStatus = (typeof TECH_STATUS)[number]

/** 비교표의 기준 (세로 줄). 카드마다 한 줄씩 짧게 적는다 */
export const COMPARE_KEYS = ['자재비', '시공 속도', '화기작업', '필요 공구', '누수 위험', '고칠 때', '맞는 곳'] as const
export type CompareKey = (typeof COMPARE_KEYS)[number]

export type TechRevision = { at: string; by: string; snapshot: string }

export type TechCard = {
  id: number
  /** 비교 세트 이름 (같은 목적의 대안 묶음, 예: 배관 이음 방식) */
  set: string
  /** 공종 중분류 코드 (F1 ~ H4) */
  category: string
  name: string
  /** 원리: 어떻게 붙고 무엇이 막는지 */
  summary: string
  pros: string
  cons: string
  /** 이럴 때 유리 / 이럴 때 피함 */
  when: string
  avoid: string
  /** 시공 요령·도구 */
  tips: string
  /** 흔한 하자와 막는 법 */
  defects: string
  /** 규격·수치 (출처가 있는 것만) */
  figures: string
  source: string
  status: TechStatus
  compare: Partial<Record<CompareKey, string>>
  updatedBy: string
  updatedAt: string
  history: TechRevision[]
}

export type TechInput = Omit<TechCard, 'id' | 'updatedBy' | 'updatedAt' | 'history'>

export const EMPTY_TECH: TechInput = {
  set: '',
  category: 'F6',
  name: '',
  summary: '',
  pros: '',
  cons: '',
  when: '',
  avoid: '',
  tips: '',
  defects: '',
  figures: '',
  source: '',
  status: '미확인',
  compare: {},
}

/** 견적 공종에 남기는 선택: 비교 세트 이름 → 고른 방식과 이유 */
export type MethodPick = { pick: string; why: string }

export function groupBySet(cards: TechCard[]): { set: string; category: string; cards: TechCard[] }[] {
  const m = new Map<string, TechCard[]>()
  for (const c of cards) m.set(`${c.category}\n${c.set}`, [...(m.get(`${c.category}\n${c.set}`) ?? []), c])
  return [...m].map(([k, list]) => ({ category: k.split('\n')[0], set: k.split('\n')[1], cards: list }))
}
