/**
 * 견적·원가·이익 계산 엔진 (순수 함수, 브라우저·서버 공용).
 *
 * 원가계산 규칙은 lib/clients/quote.ts 의 calcSection/calcQuote 와 같음:
 * 산재·고용 = 노무 기준, 산안비 = (재료+노무) 기준, 일반관리비 = 순공사원가 기준,
 * 이윤 = (노무+경비+보험료+산안비+일반관리비) 기준, 반올림 후 공정 합계 절사.
 * 그 파일은 업체 관리 화면이 쓰고 있어 고치지 않고, 여기서 est 용 타입으로 넓힘.
 * 계산은 SQL 에서 하지 않음. DB 의 합계 칸은 저장할 때 이 파일로 다시 계산해 덮어씀.
 */

export const KINDS = ['자재', '용역', '장비', '노무', '경비'] as const
export type Kind = (typeof KINDS)[number]

export type FullRates = { injury: number; employment: number; safety: number; overhead: number; profit: number }
export type SimpleRates = { misc: number; profit: number }

export type RateSet = {
  mode: 'full' | 'simple'
  rates: FullRates | SimpleRates
  /** 공정 합계 절사 단위. 0 = 절사 없음 */
  truncateUnit: number
  /** 경비 기본값 = 노무 인·일 × 이 값 */
  expensePerCrewDay: number
}

export type ActualRange = { min: number; typ: number; max: number }

export type Line = {
  id: string
  kind: Kind
  qty: number
  unitPrice: number
  removed: boolean
  /** 노무 줄의 인·일. 없으면 수량을 인·일로 봄 */
  crewDays?: number | null
  /** 실단가 범위(원/단위). 없으면 견적단가로 min=typ=max */
  actual?: ActualRange | null
  grade: string
  /** 담당자 줄(현장 조사 및 공사 관리). 원가는 내부 단가로 따로 셈 */
  isManager?: boolean
  /** 자동 경비 줄 */
  isAutoExpense?: boolean
}

export type CalcMode = 'full' | 'margin' | 'overhead' | 'none'

export type Section = { id: string; calcMode: CalcMode; isOption: boolean; lines: Line[] }

export type ManagerCfg = { visits: number; dayRateCustomer: number; dayRateInternal: number; kind: Kind; lineName: string }

export type IncentiveBasis = 'supply_pct' | 'final_profit_pct' | 'fixed_per_job'
export type IncentiveCfg = { basis: IncentiveBasis; pct: number; fixed: number; includeInExpectedCost: boolean }

export const AUTO_EXPENSE_NAME = '현장 경비(안전·소모·운반)'

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function isFullRates(r: RateSet['rates']): r is FullRates {
  return 'injury' in r
}

// ---------- 줄 ----------

/** 줄 금액. 삭제한 줄은 0 (출력·합계 모두 제외) */
export function lineAmount(l: Pick<Line, 'qty' | 'unitPrice' | 'removed'>): number {
  if (l.removed) return 0
  return Math.round(num(l.qty) * num(l.unitPrice))
}

/** 원가계산 묶음. 용역·장비는 quote.ts 처럼 경비 묶음 */
export function costGroup(kind: Kind): 'mat' | 'lab' | 'exp' {
  return kind === '자재' ? 'mat' : kind === '노무' ? 'lab' : 'exp'
}

/** 노무 줄의 인·일 */
export function lineCrewDays(l: Line): number {
  if (l.removed || l.kind !== '노무') return 0
  return l.crewDays != null ? num(l.crewDays) : num(l.qty)
}

/** 사용자가 넣은 경비 줄(담당자 줄·자동 경비 줄 제외)이 있는지 */
export function hasUserExpense(lines: Line[]): boolean {
  return lines.some((l) => !l.removed && l.kind === '경비' && !l.isManager && !l.isAutoExpense)
}

/**
 * 경비 자동 줄. 경비 줄이 하나도 없으면 Σ(노무 인·일) × 경비 단가 한 줄을 돌려줌.
 * 사용자가 경비 줄을 넣었거나 노무가 없으면 null (자동 줄은 빠짐).
 */
export function defaultExpense(lines: Line[], rateSet: RateSet): Line | null {
  if (hasUserExpense(lines)) return null
  const crew = lines.reduce((a, l) => a + lineCrewDays(l), 0)
  if (crew <= 0 || rateSet.expensePerCrewDay <= 0) return null
  return {
    id: 'auto-expense',
    kind: '경비',
    qty: crew,
    unitPrice: rateSet.expensePerCrewDay,
    removed: false,
    grade: 'rule',
    isAutoExpense: true,
  }
}

/** 담당자 줄: 방문 수 × 고객 단가. 삭제 불가, 수량(방문 수)만 고침 */
export function managerLine(cfg: ManagerCfg): Line {
  return {
    id: 'manager',
    kind: cfg.kind,
    qty: Math.max(0, num(cfg.visits)),
    unitPrice: num(cfg.dayRateCustomer),
    removed: false,
    grade: 'manager',
    isManager: true,
  }
}

// ---------- 공정·견적 ----------

export type SectionCalc = {
  mat: number
  lab: number
  exp: number
  injury: number
  employment: number
  safety: number
  /** simple 모드 공과잡비 */
  misc: number
  net: number
  overhead: number
  profit: number
  raw: number
  adjust: number
  total: number
}

function truncate(raw: number, unit: number) {
  return unit > 0 ? Math.floor(raw / unit) * unit : raw
}

export function calcSection(s: Section, rateSet: RateSet): SectionCalc {
  const sum = { mat: 0, lab: 0, exp: 0 }
  for (const l of s.lines) sum[costGroup(l.kind)] += lineAmount(l)
  const { mat, lab, exp } = sum
  const mode = s.calcMode
  let injury = 0
  let employment = 0
  let safety = 0
  let misc = 0
  let overhead = 0
  let profit = 0
  let net: number
  if (isFullRates(rateSet.rates) && rateSet.mode === 'full') {
    const r = rateSet.rates
    const on = mode === 'full'
    const ohOn = mode !== 'none'
    const profitOn = mode === 'full' || mode === 'margin'
    injury = on ? Math.round((lab * r.injury) / 100) : 0
    employment = on ? Math.round((lab * r.employment) / 100) : 0
    safety = on ? Math.round(((mat + lab) * r.safety) / 100) : 0
    net = mat + lab + exp + injury + employment + safety
    overhead = ohOn ? Math.round((net * r.overhead) / 100) : 0
    profit = profitOn ? Math.round(((lab + exp + injury + employment + safety + overhead) * r.profit) / 100) : 0
  } else {
    // simple: 누수·보험사용. 공과잡비(misc) + 이윤. none = 둘 다 없음, overhead = 공과잡비만
    const r = rateSet.rates as SimpleRates
    net = mat + lab + exp
    misc = mode === 'none' ? 0 : Math.round((net * num(r.misc)) / 100)
    profit = mode === 'none' || mode === 'overhead' ? 0 : Math.round(((net + misc) * num(r.profit)) / 100)
  }
  const raw = net + misc + overhead + profit
  const total = truncate(raw, num(rateSet.truncateUnit))
  return { mat, lab, exp, injury, employment, safety, misc, net, overhead, profit, raw, adjust: total - raw, total }
}

export type EstimateCalc = {
  sections: SectionCalc[]
  /** 공정 합계(선택 항목 제외) */
  works: number
  /** 선택 항목 합계(공급가 밖) */
  options: number
  supply: number
  vat: number
  total: number
  /** 법정 보험료(산재+고용) 합계, 선택 항목 제외 */
  insurance: number
}

/** 견적 합계. 할인은 견적 공급가에 두지 않고 실행 단계의 절충으로 따로 다룸 */
export function calcEstimate(sections: Section[], rateSet: RateSet): EstimateCalc {
  const calcs = sections.map((s) => calcSection(s, rateSet))
  let works = 0
  let options = 0
  let insurance = 0
  calcs.forEach((c, i) => {
    if (sections[i].isOption) options += c.total
    else {
      works += c.total
      insurance += c.injury + c.employment
    }
  })
  const supply = works
  const vat = Math.round(supply / 10)
  return { sections: calcs, works, options, supply, vat, total: supply + vat, insurance }
}

// ---------- 원가·이익 ----------

/** 인센티브. final_profit_pct 는 인센티브를 빼기 전 이익에 적용(순환 없음) */
export function incentive(cfg: Pick<IncentiveCfg, 'basis' | 'pct' | 'fixed'>, supply: number, profitBeforeIncentive: number): number {
  if (cfg.basis === 'supply_pct') return Math.round((num(supply) * num(cfg.pct)) / 100)
  if (cfg.basis === 'final_profit_pct') return Math.max(0, Math.round((num(profitBeforeIncentive) * num(cfg.pct)) / 100))
  return Math.round(num(cfg.fixed))
}

/** 줄의 실단가 원가(min/typ/max). 실단가가 없으면 견적단가 */
export function lineCost(l: Line): ActualRange {
  if (l.removed) return { min: 0, typ: 0, max: 0 }
  const a = l.actual ?? { min: l.unitPrice, typ: l.unitPrice, max: l.unitPrice }
  const q = num(l.qty)
  return { min: Math.round(num(a.min) * q), typ: Math.round(num(a.typ) * q), max: Math.round(num(a.max) * q) }
}

export type ExpectedCost = ActualRange & {
  lines: ActualRange
  insurance: number
  manager: number
  incentive: number
}

/**
 * 예상원가. 줄마다 실단가 × 수량, 법정 보험료(산재+고용)는 원가(설정 cost.include_insurance),
 * 산안비·일반관리비·이윤은 원가 아님, 담당자 = 방문 × 내부 단가, 인센티브는 설정에 따라 더함.
 * 인센티브는 범위와 상관없이 typ 기준 한 값(final_profit_pct 는 typ 이익 기준).
 */
export function expectedCost(
  sections: Section[],
  rateSet: RateSet,
  manager: ManagerCfg,
  incentiveCfg: IncentiveCfg,
  supply: number,
  opts: { includeInsurance?: boolean } = {},
): ExpectedCost {
  const lines = { min: 0, typ: 0, max: 0 }
  for (const s of sections) {
    if (s.isOption) continue
    for (const l of s.lines) {
      if (l.isManager) continue
      const c = lineCost(l)
      lines.min += c.min
      lines.typ += c.typ
      lines.max += c.max
    }
  }
  const insurance = opts.includeInsurance === false ? 0 : calcEstimate(sections, rateSet).insurance
  const mgr = Math.round(num(manager.visits) * num(manager.dayRateInternal))
  const base = { min: lines.min + insurance + mgr, typ: lines.typ + insurance + mgr, max: lines.max + insurance + mgr }
  const inc = incentiveCfg.includeInExpectedCost ? incentive(incentiveCfg, supply, supply - base.typ) : 0
  return { min: base.min + inc, typ: base.typ + inc, max: base.max + inc, lines, insurance, manager: mgr, incentive: inc }
}

export const pct1 = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0)

export type ProfitRange = { min: number; typ: number; max: number; marginPct: number; minPct: number; maxPct: number }

/** 예상이익: 원가가 클수록 이익이 작음 */
export function expectedProfit(supply: number, cost: ActualRange): ProfitRange {
  const min = supply - cost.max
  const typ = supply - cost.typ
  const max = supply - cost.min
  return { min, typ, max, marginPct: pct1(typ, supply), minPct: pct1(min, supply), maxPct: pct1(max, supply) }
}

export type ExecLine = { lineId: string; typ: number }
export type ExecOrder = { lineId?: string | null; planned: number; ordered: number; status?: string }

/**
 * 실행이익. 원가 = Σ 발주금액(발주 있는 줄·줄 없는 발주) + Σ 예상원가 typ(발주 없는 줄) + 고정 원가(법정 보험료) + 담당자 + 인센티브.
 * 절충이익 = Σ(planned − ordered) 따로. 취소한 발주는 빼고 그 줄은 발주 없는 줄로 봄.
 */
export function execProfit(input: {
  supply: number
  lines: ExecLine[]
  orders: ExecOrder[]
  fixedCost?: number
  managerCost: number
  incentive: number
}) {
  const live = input.orders.filter((o) => o.status !== 'canceled')
  const ordered = new Set(live.map((o) => o.lineId).filter(Boolean) as string[])
  const orderedSum = live.reduce((a, o) => a + num(o.ordered), 0)
  const rest = input.lines.filter((l) => !ordered.has(l.lineId)).reduce((a, l) => a + num(l.typ), 0)
  const cost = orderedSum + rest + num(input.fixedCost) + num(input.managerCost) + num(input.incentive)
  const negotiationGain = live.reduce((a, o) => a + (num(o.planned) - num(o.ordered)), 0)
  const profit = num(input.supply) - cost
  return { cost, profit, negotiationGain, marginPct: pct1(profit, num(input.supply)) }
}

/** 최종이익 = 수금 − 실지출(담당자·인센티브 제외) − 담당자 원가 − 인센티브 */
export function finalProfit(received: number, payments: { kind: string; amount: number }[], managerCost: number, incentiveAmount: number): number {
  const paid = payments.filter((p) => p.kind !== '담당자' && p.kind !== '인센티브').reduce((a, p) => a + num(p.amount), 0)
  return num(received) - paid - num(managerCost) - num(incentiveAmount)
}

/** 견적단가 대비 실단가 차이 %. 견적단가가 0 이면 null */
export function variancePct(est: number, act: number): number | null {
  if (!est) return null
  return Math.round(((act - est) / est) * 10000) / 100
}

// ---------- 실단가 통계 ----------

/** 최근 관측 windowCount 건으로 min/typ/max. typ = 최근값(last) 또는 중앙값(median). 관측이 없으면 null */
export function actualStats(
  observations: { unitPrice: number; observedOn: string; id?: number }[],
  windowCount: number,
  typMethod: 'last' | 'median',
): (ActualRange & { n: number }) | null {
  if (!observations.length) return null
  const sorted = [...observations].sort((a, b) => (a.observedOn === b.observedOn ? num(b.id) - num(a.id) : a.observedOn < b.observedOn ? 1 : -1))
  const win = sorted.slice(0, Math.max(1, windowCount))
  const prices = win.map((o) => num(o.unitPrice))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  let typ = prices[0]
  if (typMethod === 'median') {
    const s = [...prices].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    typ = s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
  }
  return { min, typ, max, n: win.length }
}
