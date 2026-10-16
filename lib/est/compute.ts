/**
 * 판(est_estimate) 하나의 합계·예상원가·이익 계산 (순수 함수, 서버 저장·편집기 실시간 패널 공용).
 * 판을 만들 때 복사해 둔 요율(rates_snapshot)·설정(settings_snapshot)으로 셈 → 요율이 바뀌어도 옛 판은 그대로.
 */
import {
  calcEstimate,
  defaultExpense,
  expectedCost,
  expectedProfit,
  hasUserExpense,
  type CalcMode,
  type IncentiveCfg,
  type Kind,
  type Line,
  type ManagerCfg,
  type RateSet,
  type Section,
} from './calc'
import { isAutoExpenseSnapshot } from './rules'
import { sBool, sNum, sStr, type Settings } from './settings-defaults'

export type RateSnap = {
  code: string
  name: string
  mode: 'full' | 'simple'
  rates: Record<string, number>
  truncateUnit: number
  expensePerCrewDay: number
}

export type SettingsSnap = {
  manager: { dayRateCustomer: number; dayRateInternal: number; kind: Kind; lineName: string; itemCode: string }
  incentive: Omit<IncentiveCfg, 'basis'> & { basis: IncentiveCfg['basis'] }
  validDays: number
  includeInsurance: boolean
}

export function settingsSnapshot(s: Settings): SettingsSnap {
  const kind = sStr(s, 'manager.cost_kind') as Kind
  const basis = sStr(s, 'incentive.basis')
  return {
    manager: {
      dayRateCustomer: sNum(s, 'manager.day_rate_customer'),
      dayRateInternal: sNum(s, 'manager.day_rate_internal'),
      kind: ['자재', '용역', '장비', '노무', '경비'].includes(kind) ? kind : '경비',
      lineName: sStr(s, 'manager.line_name'),
      itemCode: sStr(s, 'manager.item_code'),
    },
    incentive: {
      basis: basis === 'final_profit_pct' || basis === 'fixed_per_job' ? basis : 'supply_pct',
      pct: sNum(s, 'incentive.pct'),
      fixed: sNum(s, 'incentive.fixed'),
      includeInExpectedCost: sBool(s, 'incentive.include_in_expected_cost'),
    },
    validDays: sNum(s, 'doc.valid_days'),
    includeInsurance: sBool(s, 'cost.include_insurance'),
  }
}

export function toRateSet(r: RateSnap): RateSet {
  return {
    mode: r.mode,
    rates: r.mode === 'full'
      ? { injury: +r.rates.injury || 0, employment: +r.rates.employment || 0, safety: +r.rates.safety || 0, overhead: +r.rates.overhead || 0, profit: +r.rates.profit || 0 }
      : { misc: +r.rates.misc || 0, profit: +r.rates.profit || 0 },
    truncateUnit: Number(r.truncateUnit) || 0,
    expensePerCrewDay: Number(r.expensePerCrewDay) || 0,
  }
}

export function managerCfg(s: SettingsSnap, visits: number): ManagerCfg {
  return { visits, dayRateCustomer: s.manager.dayRateCustomer, dayRateInternal: s.manager.dayRateInternal, kind: s.manager.kind, lineName: s.manager.lineName }
}

export type LineLike = {
  id: number | string
  kind: Kind
  qty: number
  unitPrice: number
  removed: boolean
  crewDays?: number | null
  actual?: { min: number; typ: number; max: number } | null
  grade: string
  qtyRuleSnapshot?: unknown
}
export type SectionLike = { id: number | string; calcMode: CalcMode; isOption: boolean; lines: LineLike[] }

export function toCalcLine(l: LineLike): Line {
  return {
    id: String(l.id),
    kind: l.kind,
    qty: Number(l.qty) || 0,
    unitPrice: Number(l.unitPrice) || 0,
    removed: l.removed,
    crewDays: l.kind === '노무' ? (l.crewDays ?? l.qty) : null,
    actual: l.actual ?? null,
    grade: l.grade,
    isManager: l.grade === 'manager',
    isAutoExpense: isAutoExpenseSnapshot(l.qtyRuleSnapshot),
  }
}

export function toCalcSections(sections: SectionLike[]): Section[] {
  return sections.map((s) => ({ id: String(s.id), calcMode: s.calcMode, isOption: s.isOption, lines: s.lines.map(toCalcLine) }))
}

export function computeEstimate(input: { rateSnap: RateSnap; settingsSnap: SettingsSnap; managerVisits: number; sections: SectionLike[] }) {
  const rateSet = toRateSet(input.rateSnap)
  const sections = toCalcSections(input.sections)
  const calc = calcEstimate(sections, rateSet)
  const cost = expectedCost(sections, rateSet, managerCfg(input.settingsSnap, input.managerVisits), input.settingsSnap.incentive, calc.supply, {
    includeInsurance: input.settingsSnap.includeInsurance,
  })
  const profit = expectedProfit(calc.supply, cost)
  return { rateSet, calc, cost, profit }
}

export type AutoExpenseAction =
  | { kind: 'none' }
  | { kind: 'remove'; lineId: number | string }
  | { kind: 'update'; lineId: number | string; qty: number; unitPrice: number }
  | { kind: 'insert'; sectionId: number | string; qty: number; unitPrice: number }

/**
 * 경비 자동 줄 맞추기: 사용자 경비 줄이 있으면 자동 줄을 빼고, 없으면 Σ 노무 인·일 × 경비 단가로 두거나 넣음.
 * 사용자가 자동 줄을 직접 삭제(removed)했으면 그대로 둠(NO_EXPENSE 경고로 알림).
 */
export function autoExpenseAction(sections: SectionLike[], rateSnap: RateSnap): AutoExpenseAction {
  const all = sections.filter((s) => !s.isOption).flatMap((s) => s.lines)
  const auto = all.find((l) => isAutoExpenseSnapshot(l.qtyRuleSnapshot))
  if (auto?.removed) return { kind: 'none' }
  const calcLines = all.map(toCalcLine)
  const want = defaultExpense(calcLines, toRateSet(rateSnap))
  if (!want || hasUserExpense(calcLines)) return auto ? { kind: 'remove', lineId: auto.id } : { kind: 'none' }
  if (auto) return auto.qty === want.qty && auto.unitPrice === want.unitPrice ? { kind: 'none' } : { kind: 'update', lineId: auto.id, qty: want.qty, unitPrice: want.unitPrice }
  const target = [...sections].reverse().find((s) => !s.isOption)
  return target ? { kind: 'insert', sectionId: target.id, qty: want.qty, unitPrice: want.unitPrice } : { kind: 'none' }
}
