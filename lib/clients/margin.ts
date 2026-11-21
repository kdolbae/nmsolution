/**
 * 내부 원가·영업이익 계산 (어드민 전용). 고객 화면·인쇄·PDF 에는 쓰지 않는다.
 *
 * 2026-11-14 kevin: 견적에는 영업이익 10% 만 넣는다.
 *   실원가 = 자재 실매입 + 실지급 인건비 + 산재·고용보험 + 경비 실비
 *   원가 하한 = 실원가 × (1 + 운영비 5%)
 *   기준 공급가 = 원가 하한 ÷ (1 − 영업이익률 10%)
 * 줄마다 실원가 단가(QuoteItem.cost)를 넣으면 그 값을 쓰고, 비우면 아래 기준표로 추정한다.
 */

import { DEFAULT_MAT_UP, calcQuote, emptyItem, itemAmount, type Quote, type QuoteItem, type QuoteSection } from './quote'

/** 영업이익률 %, 공급가 기준 */
export const OP_MARGIN = 10
/** 회사 운영비 %, 실원가 기준 (차량·소모품·관리 시간) */
export const OP_OVERHEAD = 5

/** 실지급 일당 기준표. 위에서부터 품명에 들어 있는 첫 줄을 쓴다 */
const WAGES: [RegExp, number][] = [
  [/간접노무비/, 0],
  [/용접사/, 400_000],
  [/배관공/, 300_000],
  [/고급/, 250_000],
  [/중급/, 200_000],
  [/초급/, 160_000],
  [/전기/, 250_000],
]

/** 실원가 단가. 넣은 값이 없으면 추정값 (노무비는 기준표 또는 견적 일당의 72%, 그 밖에는 견적 단가 그대로) */
export function unitCost(i: QuoteItem): { cost: number; assumed: boolean } {
  if (typeof i.cost === 'number') return { cost: i.cost, assumed: false }
  if (i.kind !== '노무비') return { cost: Number(i.price) || 0, assumed: true }
  const hit = WAGES.find(([re]) => re.test(i.name))
  // 간접노무비는 실제로 나가는 돈이 아니라 추정이 아니다
  if (hit) return { cost: hit[1] === 0 ? 0 : Math.min(hit[1], Number(i.price) || hit[1]), assumed: hit[1] !== 0 }
  return { cost: Math.round(((Number(i.price) || 0) * 0.72) / 10_000) * 10_000, assumed: true }
}

export type Margin = {
  /** 실원가 (자재 + 인건비 + 보험 + 경비) */
  direct: number
  /** 원가 하한 = 실원가 + 운영비 */
  floor: number
  /** 영업이익 10% 기준 공급가 (천원 올림) */
  target: number
  /** 지금 공급가 */
  supply: number
  /** 지금 공급가 − 원가 하한 */
  profit: number
  /** 지금 영업이익률 % (공급가 기준) */
  rate: number
  /** 실원가 단가를 넣지 않아 추정한 줄 수 */
  assumed: number
}

export function calcMargin(q: Quote): Margin {
  let mat = 0
  let lab = 0
  let exp = 0
  let assumed = 0
  for (const s of q.sections) {
    if (s.option) continue
    for (const i of s.items) {
      if (!itemAmount(i)) continue
      const u = unitCost(i)
      if (u.assumed) assumed++
      const amount = (Number(i.qty) || 0) * u.cost
      // 여분율만큼 실제로 더 사므로 원가에도 넣는다 (원가 단가를 넣은 줄만. 추정 줄은 견적 단가에 이미 들어 있다고 본다)
      if (i.kind === '재료비') mat += u.assumed ? amount : amount * (1 + (q.matSpare ?? 0) / 100)
      else if (i.kind === '노무비') lab += amount
      else exp += amount
    }
  }
  const insurance = (lab * (q.rates.injury + q.rates.employment)) / 100
  const direct = Math.round(mat + lab + exp + insurance)
  const floor = Math.round(direct * (1 + OP_OVERHEAD / 100))
  const target = Math.ceil(floor / (1 - OP_MARGIN / 100) / 1000) * 1000
  const supply = calcQuote(q).supply
  const profit = supply - floor
  return { direct, floor, target, supply, profit, rate: supply > 0 ? (profit / supply) * 100 : 0, assumed }
}

// ---------- 자재 인상률·여분율, 자재비 비례 인건비 ----------

/** 원가 단가 → 견적 단가: 원가 × (1 + 인상률 + 여분율). 100원 단위(1,000원 미만은 10원 단위) 반올림 */
export function matPrice(cost: number, q: Pick<Quote, 'matUp' | 'matSpare'>): number {
  const raw = cost * (1 + ((q.matUp ?? DEFAULT_MAT_UP) + (q.matSpare ?? 0)) / 100)
  const unit = raw < 1000 ? 10 : 100
  return Math.round(raw / unit) * unit
}

/** 원가 단가를 넣은 재료비 줄의 견적 단가를 지금 인상률·여분율로 다시 계산한다 */
export function repriceMaterials(q: Quote): Quote {
  return {
    ...q,
    sections: q.sections.map((s) => ({
      ...s,
      items: s.items.map((i) => (i.kind === '재료비' && typeof i.cost === 'number' ? { ...i, price: matPrice(i.cost, q) } : i)),
    })),
  }
}

/** 공종의 자재비 비례 인건비 금액 (천원 미만 버림) */
export function ratioLabor(s: QuoteSection): number {
  const mat = s.items.reduce((a, i) => (i.kind === '재료비' ? a + itemAmount(i) : a), 0)
  return Math.floor((mat * (s.laborRatio ?? 0)) / 100 / 1000) * 1000
}

/**
 * laborRatio 를 켠 공종마다 자동 인건비 줄(auto: 'labor') 하나를 자재비 × 비율로 맞춘다.
 * 줄이 없으면 만들고, 비율을 끄면 자동 표시만 떼어 보통 줄로 남긴다. 바뀐 것이 없으면 받은 객체를 그대로 돌려준다.
 */
export function syncLabor(q: Quote): Quote {
  let changed = false
  const sections = q.sections.map((s) => {
    const on = (s.laborRatio ?? 0) > 0
    const idx = s.items.findIndex((i) => i.auto === 'labor')
    if (!on) {
      if (idx < 0) return s
      changed = true
      return { ...s, items: s.items.map((i) => (i.auto === 'labor' ? { ...i, auto: undefined } : i)) }
    }
    const price = ratioLabor(s)
    if (idx < 0) {
      changed = true
      const line: QuoteItem = { ...emptyItem('노무비'), name: '시공 인건비', spec: '자재 설치·시공', unit: '식', qty: 1, price, auto: 'labor' }
      const last = s.items.map((i) => i.kind).lastIndexOf('재료비')
      const items = [...s.items]
      items.splice(last + 1, 0, line)
      return { ...s, items }
    }
    const cur = s.items[idx]
    if (cur.price === price && cur.qty === 1 && cur.kind === '노무비') return s
    changed = true
    return { ...s, items: s.items.map((i, n) => (n === idx ? { ...i, kind: '노무비' as const, qty: 1, price } : i)) }
  })
  return changed ? { ...q, sections } : q
}
