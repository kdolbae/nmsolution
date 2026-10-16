import { describe, expect, it, test } from 'vitest'
import {
  calcEstimate,
  calcSection,
  defaultExpense,
  execProfit,
  expectedCost,
  expectedProfit,
  finalProfit,
  incentive,
  actualStats,
  lineAmount,
  managerLine,
  variancePct,
  type IncentiveCfg,
  type Line,
  type ManagerCfg,
  type RateSet,
  type Section,
} from '../calc'
import { calcQuote, type Quote, type ItemKind } from '@/lib/clients/quote'
import { KKT_QUOTE } from '@/lib/clients/seed-kkt'
import type { Kind } from '../calc'

const NM_DEFAULT: RateSet = {
  mode: 'full',
  rates: { injury: 3.56, employment: 1.15, safety: 3.11, overhead: 5, profit: 15 },
  truncateUnit: 1000,
  expensePerCrewDay: 50000,
}

const MANAGER: ManagerCfg = { visits: 3, dayRateCustomer: 350000, dayRateInternal: 300000, kind: '경비', lineName: '현장 조사 및 공사 관리' }
const INCENTIVE: IncentiveCfg = { basis: 'supply_pct', pct: 3, fixed: 300000, includeInExpectedCost: true }

/** 기획서 §5.3 예제: 중량물 이동·안착, NM_DEFAULT, 담당자 3회 */
function exampleLines(): Line[] {
  const lines: Line[] = [
    { id: 'rigger', kind: '노무', qty: 8, unitPrice: 300000, removed: false, grade: 'required', actual: { min: 260000, typ: 280000, max: 300000 } },
    { id: 'signal', kind: '노무', qty: 4, unitPrice: 180000, removed: false, grade: 'rule', actual: { min: 150000, typ: 160000, max: 175000 } },
    { id: 'crane', kind: '장비', qty: 2, unitPrice: 2500000, removed: false, grade: 'basic', actual: { min: 2000000, typ: 2200000, max: 2600000 } },
    { id: 'sling', kind: '자재', qty: 1, unitPrice: 400000, removed: false, grade: 'required', actual: { min: 300000, typ: 350000, max: 420000 } },
  ]
  const auto = defaultExpense(lines, NM_DEFAULT)!
  return [...lines, auto, managerLine(MANAGER)]
}

const exampleSections = (): Section[] => [{ id: 's1', calcMode: 'full', isOption: false, lines: exampleLines() }]

describe('§5.3 예제 (full)', () => {
  it('경비 자동 줄 = 12 인·일 × 50,000', () => {
    const auto = exampleLines().find((l) => l.isAutoExpense)!
    expect(auto.qty).toBe(12)
    expect(lineAmount(auto)).toBe(600000)
  })

  it('원가계산 내역', () => {
    const c = calcSection(exampleSections()[0], NM_DEFAULT)
    expect(c.mat).toBe(400000)
    expect(c.lab).toBe(3120000)
    expect(c.exp).toBe(6650000)
    expect(c.injury).toBe(111072)
    expect(c.employment).toBe(35880)
    expect(c.safety).toBe(109472)
    expect(c.net).toBe(10426424)
    expect(c.overhead).toBe(521321)
    expect(c.profit).toBe(1582162)
    expect(c.raw).toBe(12529907)
    expect(c.adjust).toBe(-907)
    expect(c.total).toBe(12529000)
  })

  it('공급가·VAT·합계', () => {
    const e = calcEstimate(exampleSections(), NM_DEFAULT)
    expect(e.supply).toBe(12529000)
    expect(e.vat).toBe(1252900)
    expect(e.total).toBe(13781900)
    expect(e.insurance).toBe(146952)
  })

  it('예상원가·예상이익', () => {
    const sections = exampleSections()
    const supply = calcEstimate(sections, NM_DEFAULT).supply
    const cost = expectedCost(sections, NM_DEFAULT, MANAGER, INCENTIVE, supply)
    expect(cost.incentive).toBe(375870)
    expect(cost.manager).toBe(900000)
    expect(cost.typ).toBe(9652822)
    expect(cost.min).toBe(9002822)
    expect(cost.max).toBe(10742822)
    const p = expectedProfit(supply, cost)
    expect(p.typ).toBe(2876178)
    expect(p.marginPct).toBe(23.0)
    expect(p.min).toBe(1786178)
    expect(p.minPct).toBe(14.3)
    expect(p.max).toBe(3526178)
    expect(p.maxPct).toBe(28.1)
  })

  it('실행이익·절충이익', () => {
    const r = execProfit({
      supply: 12529000,
      lines: [
        { lineId: 'rigger', typ: 2240000 },
        { lineId: 'signal', typ: 640000 },
        { lineId: 'crane', typ: 4400000 },
        { lineId: 'sling', typ: 350000 },
        { lineId: 'auto', typ: 600000 },
      ],
      orders: [
        { lineId: 'crane', planned: 4400000, ordered: 4200000, status: 'ordered' },
        { lineId: 'rigger', planned: 2240000, ordered: 2300000, status: 'ordered' },
      ],
      fixedCost: 146952,
      managerCost: 900000,
      incentive: 375870,
    })
    expect(r.negotiationGain).toBe(140000)
    expect(r.profit).toBe(3016178)
  })

  it('최종이익', () => {
    expect(finalProfit(12529000, [{ kind: '장비', amount: 8120000 }, { kind: '담당자', amount: 999 }], 1200000, 375870)).toBe(2833130)
  })
})

describe('simple 모드', () => {
  const SIMPLE: RateSet = { mode: 'simple', rates: { misc: 5, profit: 10 }, truncateUnit: 1000, expensePerCrewDay: 0 }
  it('net 1,000,000 · misc 5 · profit 10', () => {
    const c = calcSection({ id: 's', calcMode: 'full', isOption: false, lines: [{ id: 'a', kind: '자재', qty: 1, unitPrice: 1000000, removed: false, grade: 'basic' }] }, SIMPLE)
    expect(c.misc).toBe(50000)
    expect(c.profit).toBe(105000)
    expect(c.raw).toBe(1155000)
    expect(c.total).toBe(1155000)
  })
})

describe('절사·삭제·선택', () => {
  it('절사 unit 0 이면 adjust 0', () => {
    const c = calcSection(exampleSections()[0], { ...NM_DEFAULT, truncateUnit: 0 })
    expect(c.adjust).toBe(0)
    expect(c.total).toBe(12529907)
  })

  it('삭제 줄은 금액·보험료·원가 모두 제외', () => {
    const base = exampleSections()
    const removed = exampleSections()
    removed[0].lines.push({ id: 'x', kind: '노무', qty: 10, unitPrice: 500000, removed: true, grade: 'basic', actual: { min: 1, typ: 1, max: 1 } })
    const a = calcEstimate(base, NM_DEFAULT)
    const b = calcEstimate(removed, NM_DEFAULT)
    expect(b.supply).toBe(a.supply)
    expect(b.insurance).toBe(a.insurance)
    const ca = expectedCost(base, NM_DEFAULT, MANAGER, INCENTIVE, a.supply)
    const cb = expectedCost(removed, NM_DEFAULT, MANAGER, INCENTIVE, b.supply)
    expect(cb.typ).toBe(ca.typ)
    expect(lineAmount(removed[0].lines.at(-1)!)).toBe(0)
  })

  it('선택 항목은 공급가 밖', () => {
    const s = exampleSections()
    s.push({ id: 'o', calcMode: 'none', isOption: true, lines: [{ id: 'o1', kind: '자재', qty: 1, unitPrice: 100000, removed: false, grade: 'manual' }] })
    const e = calcEstimate(s, NM_DEFAULT)
    expect(e.supply).toBe(12529000)
    expect(e.options).toBe(100000)
  })

  it('사용자 경비 줄이 있으면 자동 경비 줄 없음', () => {
    const lines: Line[] = [
      { id: 'l', kind: '노무', qty: 4, unitPrice: 1, removed: false, grade: 'basic' },
      { id: 'e', kind: '경비', qty: 1, unitPrice: 1, removed: false, grade: 'basic' },
    ]
    expect(defaultExpense(lines, NM_DEFAULT)).toBeNull()
    expect(defaultExpense([lines[0], managerLine(MANAGER)], NM_DEFAULT)?.qty).toBe(4)
  })
})

describe('인센티브·차이', () => {
  it('final_profit_pct 10%, 인센티브 전 이익 3,000,000 → 300,000, 최종이익 2,700,000', () => {
    const inc = incentive({ basis: 'final_profit_pct', pct: 10, fixed: 0 }, 50000000, 3000000)
    expect(inc).toBe(300000)
    expect(3000000 - inc).toBe(2700000)
  })
  it('fixed_per_job', () => {
    expect(incentive({ basis: 'fixed_per_job', pct: 3, fixed: 300000 }, 1, 1)).toBe(300000)
  })
  it('절충이익: 양·음 혼합, 취소 발주 제외', () => {
    const r = execProfit({
      supply: 1000,
      lines: [],
      orders: [
        { planned: 500, ordered: 400 },
        { planned: 300, ordered: 350 },
        { planned: 100, ordered: 0, status: 'canceled' },
      ],
      managerCost: 0,
      incentive: 0,
    })
    expect(r.negotiationGain).toBe(50)
  })
  it('variancePct', () => {
    expect(variancePct(2500000, 2200000)).toBe(-12)
    expect(variancePct(0, 10)).toBeNull()
  })
  it('실단가 통계: 최근 N건, last / median', () => {
    const obs = [
      { unitPrice: 100, observedOn: '2026-01-01', id: 1 },
      { unitPrice: 300, observedOn: '2026-03-01', id: 2 },
      { unitPrice: 200, observedOn: '2026-02-01', id: 3 },
    ]
    expect(actualStats(obs, 10, 'last')).toEqual({ min: 100, typ: 300, max: 300, n: 3 })
    expect(actualStats(obs, 2, 'median')).toEqual({ min: 200, typ: 250, max: 300, n: 2 })
    expect(actualStats([], 10, 'last')).toBeNull()
  })
})

/** quote.ts 견적서 → est 모델. 재료비 → 자재, 노무비 → 노무, 그 밖은 경비 묶음 */
function fromQuote(q: Quote): { sections: Section[]; rateSet: RateSet } {
  const kind = (k: ItemKind): Kind => (k === '재료비' ? '자재' : k === '노무비' ? '노무' : k === '장비' ? '장비' : '경비')
  return {
    rateSet: { mode: 'full', rates: q.rates, truncateUnit: q.truncate ? 1000 : 0, expensePerCrewDay: 0 },
    sections: q.sections.map((s) => ({
      id: s.id,
      isOption: Boolean(s.option),
      calcMode: !q.costCalc || s.flat ? 'none' : s.overheadOnly ? 'overhead' : s.noInsurance ? 'margin' : 'full',
      lines: s.items.map((i) => ({ id: i.id, kind: kind(i.kind), qty: i.qty, unitPrice: i.price, removed: false, grade: 'manual' })),
    })),
  }
}

describe('금강변압기 A안', () => {
  it('두 엔진의 공정 합계·공정별 금액이 같음(할인은 est 에서 실행 단계 절충으로 다룸)', () => {
    const q = KKT_QUOTE
    const { sections, rateSet } = fromQuote(q)
    const old = calcQuote(q)
    const est = calcEstimate(sections, rateSet)
    expect(est.sections.map((s) => s.total)).toEqual(old.sections.map((s) => s.total))
    expect(est.works).toBe(old.works)
    expect(est.options).toBe(old.options)
    // 할인이 없을 때의 합계도 같음
    const noDisc = calcQuote({ ...q, discount: 0 })
    expect(est.total).toBe(noDisc.grand)
  })
  test.todo('금강변압기 A안 71,692,000원 — 실자료 대기')
})
