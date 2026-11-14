/**
 * 내부 원가·영업이익 계산 (어드민 전용). 고객 화면·인쇄·PDF 에는 쓰지 않는다.
 *
 * 2026-11-14 kevin: 견적에는 영업이익 10% 만 넣는다.
 *   실원가 = 자재 실매입 + 실지급 인건비 + 산재·고용보험 + 경비 실비
 *   원가 하한 = 실원가 × (1 + 운영비 5%)
 *   기준 공급가 = 원가 하한 ÷ (1 − 영업이익률 10%)
 * 줄마다 실원가 단가(QuoteItem.cost)를 넣으면 그 값을 쓰고, 비우면 아래 기준표로 추정한다.
 */

import { calcQuote, itemAmount, type Quote, type QuoteItem } from './quote'

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
      if (i.kind === '재료비') mat += amount
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
