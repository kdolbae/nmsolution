import { describe, expect, it } from 'vitest'
import { buildDraft, evalCondition, qtyFromRule, type DraftInput, type ItemMaster } from '../rules'
import { runChecks, checkPassed, type CheckInput, type CheckLine } from '../checks'
import { SETTING_DEFAULT_MAP } from '../settings-defaults'
import type { RateSet } from '../calc'

describe('qtyFromRule', () => {
  it('area_factor up (area 123, factor 0.05) → 7', () => {
    expect(qtyFromRule({ type: 'area_factor', question: 'area_m2', factor: 0.05, round: 'up' }, { area_m2: 123 }).qty).toBe(7)
  })
  it('people_times_answer (2명, lift_days 3) → 6', () => {
    expect(qtyFromRule({ type: 'people_times_answer', people: 2, question: 'lift_days' }, { lift_days: 3 }).qty).toBe(6)
  })
  it('people_days', () => {
    expect(qtyFromRule({ type: 'people_days', people_q: 'rigger_people', days_q: 'lift_days' }, { rigger_people: 4, lift_days: 2 }).qty).toBe(8)
  })
  it('답이 없으면 null + confirm_needed', () => {
    const r = qtyFromRule({ type: 'answer', question: 'pipe_m' }, {})
    expect(r.qty).toBeNull()
    expect(r.confirmNeeded).toBe(true)
  })
})

describe('evalCondition', () => {
  it('eq / gte / all / 미답', () => {
    expect(evalCondition({ question: 'hot_work', op: 'eq', value: true }, { hot_work: true })).toBe(true)
    expect(evalCondition({ question: 'crane_ton', op: 'eq', value: 60 }, { crane_ton: '60' })).toBe(true)
    expect(evalCondition({ question: 'height_m', op: 'gte', value: 3 }, { height_m: 2 })).toBe(false)
    expect(evalCondition({ question: 'height_m', op: 'gte', value: 3 }, {})).toBeNull()
    const c = { all: [{ question: 'height_m', op: 'gte' as const, value: 2 }, { question: 'scaffold_m2', op: 'eq' as const, value: 0 }] }
    expect(evalCondition(c, { height_m: 5, scaffold_m2: 0 })).toBe(true)
    expect(evalCondition(c, { height_m: 1 })).toBe(false)
  })
})

const RATE: RateSet = { mode: 'full', rates: { injury: 3.56, employment: 1.15, safety: 3.11, overhead: 5, profit: 15 }, truncateUnit: 1000, expensePerCrewDay: 50000 }
const item = (code: string, kind: ItemMaster['kind'], price: number, qtyRuleType: string, qtyRule: unknown, extra: Partial<ItemMaster> = {}): ItemMaster => ({
  code,
  kind,
  name: code,
  spec: '',
  unit: '식',
  price,
  basisText: '현장 확인 기준으로 산정함',
  internalMemo: 'SECRET',
  qtyRuleType,
  qtyRule,
  class3Id: 1,
  ...extra,
})

function draftInput(answers: Record<string, unknown>): DraftInput {
  return {
    templateItems: [
      { itemCode: 'LAB-RIGGER', grade: 'required', sortOrder: 1 },
      { itemCode: 'MAT-SLING', grade: 'required', sortOrder: 2 },
      { itemCode: 'MGR-SITE', grade: 'required', sortOrder: 3 },
      { itemCode: 'EQP-CRANE-100T', grade: 'basic', sortOrder: 4, removeIf: { question: 'client_provides_crane', op: 'truthy', reason: 'client_provides' } },
      { itemCode: 'LAB-WELDER', grade: 'conditional', sortOrder: 5, condition: { question: 'hot_work', op: 'eq', value: true } },
    ],
    items: {
      'LAB-RIGGER': item('LAB-RIGGER', '노무', 300000, 'people_days', { people_q: 'rigger_people', days_q: 'lift_days' }),
      'MAT-SLING': item('MAT-SLING', '자재', 400000, 'fixed', { qty: 1 }),
      'MGR-SITE': item('MGR-SITE', '경비', 350000, 'visits', {}),
      'EQP-CRANE-100T': item('EQP-CRANE-100T', '장비', 2500000, 'answer', { question: 'lift_days' }),
      'LAB-WELDER': item('LAB-WELDER', '노무', 350000, 'people_days', { people: 1, days_q: 'hot_work_days' }),
      'LAB-SIGNAL': item('LAB-SIGNAL', '노무', 180000, 'rule', { rule_code: 'CRANE_SIGNAL' }),
      'LAB-FIRE-WATCH': item('LAB-FIRE-WATCH', '노무', 180000, 'rule', { rule_code: 'FIRE_WATCH' }),
    },
    rules: [
      { code: 'CRANE_SIGNAL', name: '신호수', condition: { question: 'crane', op: 'eq', value: true }, action: { add_item: 'LAB-SIGNAL', qty: { type: 'people_times_answer', people: 2, question: 'lift_days' } }, message: '크레인 작업인데 신호수가 없음', severity: 'error' },
      { code: 'FIRE_WATCH', name: '화재감시자', condition: { question: 'hot_work', op: 'eq', value: true }, action: { add_item: 'LAB-FIRE-WATCH', qty: { type: 'answer_mul', question: 'hot_work_days', factor: 1 } }, message: '화기작업인데 화재감시자가 없음', severity: 'error' },
    ],
    answers,
    classes: { 1: { code: 'L3', name: '인양', sort: 1 } },
    manager: { itemCode: 'MGR-SITE', visits: 3, dayRateCustomer: 350000, kind: '경비', lineName: '현장 조사 및 공사 관리' },
    rateSet: RATE,
    confirmText: '협의 후 확정',
  }
}

describe('buildDraft', () => {
  it('템플릿 + 규칙 + 담당자 + 경비 자동 줄', () => {
    const d = buildDraft(draftInput({ rigger_people: 4, lift_days: 2, crane: true, hot_work: false }))
    const lines = d.sections.flatMap((s) => s.lines)
    const by = (n: string) => lines.find((l) => l.itemCode === n || l.name === n)
    expect(by('LAB-RIGGER')?.qty).toBe(8)
    expect(by('LAB-SIGNAL')?.qty).toBe(4)
    expect(by('LAB-SIGNAL')?.grade).toBe('rule')
    expect(by('EQP-CRANE-100T')?.removed).toBe(false)
    expect(by('LAB-WELDER')).toBeUndefined()
    expect(by('LAB-FIRE-WATCH')).toBeUndefined()
    const mgr = lines.find((l) => l.grade === 'manager')!
    expect(mgr.qty).toBe(3)
    expect(mgr.name).toBe('현장 조사 및 공사 관리')
    // 경비 줄은 담당자 줄뿐이라 자동 경비 줄(인·일 12 × 50,000)이 붙음
    const auto = lines.find((l) => (l.qtyRuleSnapshot as { type?: string })?.type === 'auto_expense')!
    expect(auto.qty).toBe(12)
  })

  it('발주처 크레인 제공이면 크레인 삭제 제안, 화기작업이면 용접사·화재감시자', () => {
    const d = buildDraft(draftInput({ rigger_people: 4, lift_days: 2, crane: false, client_provides_crane: true, hot_work: true, hot_work_days: 3 }))
    const lines = d.sections.flatMap((s) => s.lines)
    const crane = lines.find((l) => l.itemCode === 'EQP-CRANE-100T')!
    expect(crane.removed).toBe(true)
    expect(crane.removedReason).toBe('client_provides')
    expect(lines.find((l) => l.itemCode === 'LAB-WELDER')?.qty).toBe(3)
    expect(lines.find((l) => l.itemCode === 'LAB-FIRE-WATCH')?.qty).toBe(3)
  })

  it('답이 없으면 수량 0 + 확인 필요 + 근거문구에 협의 후 확정', () => {
    const d = buildDraft(draftInput({ crane: false }))
    const rigger = d.sections.flatMap((s) => s.lines).find((l) => l.itemCode === 'LAB-RIGGER')!
    expect(rigger.qty).toBe(0)
    expect(rigger.confirmNeeded).toBe(true)
    expect(rigger.basisText).toContain('협의 후 확정')
  })
})

// ---------- 자동 검사 ----------

const baseLine = (p: Partial<CheckLine>): CheckLine => ({
  id: p.id ?? 'l',
  itemCode: null,
  kind: '자재',
  name: '자재',
  spec: '',
  basisText: '현장 확인 기준으로 산정함',
  qty: 1,
  unitPrice: 1000,
  grade: 'basic',
  removed: false,
  confirmNeeded: false,
  ...p,
})

function checkInput(p: Partial<CheckInput> = {}): CheckInput {
  return {
    managerCount: 1,
    managerVisits: 2,
    lines: [baseLine({ id: 'm', kind: '경비', name: '현장 조사 및 공사 관리', grade: 'manager', isManager: true }), baseLine({ id: 'e', kind: '경비', name: '경비' })],
    notesCustomer: '',
    answers: {},
    rules: [],
    conditionalItems: [],
    itemPrices: {},
    actualCounts: {},
    marginPct: 20,
    settings: { ...SETTING_DEFAULT_MAP },
    ...p,
  }
}
const codes = (c: CheckInput) => runChecks(c).map((r) => r.code)

describe('자동 검사', () => {
  it('기본 입력은 통과', () => {
    expect(runChecks(checkInput())).toEqual([])
    expect(checkPassed(runChecks(checkInput()))).toBe(true)
  })
  it('NO_MANAGER', () => {
    expect(codes(checkInput({ managerCount: 0 }))).toContain('NO_MANAGER')
  })
  it('담당자 visits 0 → MANAGER_VISITS error', () => {
    const r = runChecks(checkInput({ managerVisits: 0 }))
    expect(r.find((x) => x.code === 'MANAGER_VISITS')?.severity).toBe('error')
    expect(codes(checkInput({ managerVisits: 1 }))).not.toContain('MANAGER_VISITS')
  })
  it('REQUIRED_REMOVED', () => {
    const lines = [...checkInput().lines, baseLine({ id: 'r', grade: 'required', removed: true })]
    expect(codes(checkInput({ lines }))).toContain('REQUIRED_REMOVED')
    expect(codes(checkInput())).not.toContain('REQUIRED_REMOVED')
  })
  it('RULE_MISSING: 화기작업인데 화재감시자 없음 → 넣으면 해결', () => {
    const rules = [{ code: 'FIRE_WATCH', name: '화재감시자', condition: { question: 'hot_work', op: 'eq' as const, value: true }, action: { add_item: 'LAB-FIRE-WATCH' }, message: '화기작업인데 화재감시자가 없음', severity: 'error' as const }]
    expect(codes(checkInput({ rules, answers: { hot_work: true } }))).toContain('RULE_MISSING')
    expect(codes(checkInput({ rules, answers: { hot_work: false } }))).not.toContain('RULE_MISSING')
    const lines = [...checkInput().lines, baseLine({ id: 'f', itemCode: 'LAB-FIRE-WATCH', kind: '노무', grade: 'rule', qty: 2 })]
    expect(codes(checkInput({ rules, answers: { hot_work: true }, lines, actualCounts: { 'LAB-FIRE-WATCH': 1 } }))).not.toContain('RULE_MISSING')
  })
  it('RULE_QTY_ZERO', () => {
    const lines = [...checkInput().lines, baseLine({ id: 'z', grade: 'rule', qty: 0 })]
    expect(codes(checkInput({ lines }))).toContain('RULE_QTY_ZERO')
  })
  it('MARGIN_LOW (심각도 설정)', () => {
    expect(runChecks(checkInput({ marginPct: 5 })).find((r) => r.code === 'MARGIN_LOW')?.severity).toBe('warn')
    const s = { ...SETTING_DEFAULT_MAP, 'profit.min_margin_severity': 'error' }
    expect(runChecks(checkInput({ marginPct: 5, settings: s })).find((r) => r.code === 'MARGIN_LOW')?.severity).toBe('error')
    expect(codes(checkInput({ marginPct: 12 }))).not.toContain('MARGIN_LOW')
  })
  it('금지어: "원가" 포함 근거문구 → INTERNAL_WORDS', () => {
    const lines = [...checkInput().lines, baseLine({ id: 'w', basisText: '원가 기준으로 산정함' })]
    expect(codes(checkInput({ lines }))).toContain('INTERNAL_WORDS')
    expect(codes(checkInput({ notesCustomer: '인센티브 포함' }))).toContain('INTERNAL_WORDS')
  })
  it('CONFIRM_TEXT', () => {
    const bad = [...checkInput().lines, baseLine({ id: 'c', confirmNeeded: true })]
    const good = [...checkInput().lines, baseLine({ id: 'c', confirmNeeded: true, basisText: '면적 기준 (협의 후 확정)' })]
    expect(codes(checkInput({ lines: bad }))).toContain('CONFIRM_TEXT')
    expect(codes(checkInput({ lines: good }))).not.toContain('CONFIRM_TEXT')
  })
  it('UNANSWERED_CONDITION', () => {
    const conditionalItems = [{ itemCode: 'EQP-SKY', name: '고소작업차', condition: { question: 'height_m', op: 'gte' as const, value: 3 } }]
    expect(codes(checkInput({ conditionalItems }))).toContain('UNANSWERED_CONDITION')
    expect(codes(checkInput({ conditionalItems, answers: { height_m: 1 } }))).not.toContain('UNANSWERED_CONDITION')
  })
  it('NO_EXPENSE', () => {
    expect(codes(checkInput({ lines: [checkInput().lines[0]] }))).toContain('NO_EXPENSE')
  })
  it('PRICE_STALE · ACTUAL_MISSING · VARIANCE_HIGH', () => {
    const lines = [...checkInput().lines, baseLine({ id: 'p', itemCode: 'MAT-X', unitPrice: 1000, actual: { min: 1, typ: 1200, max: 2000 } })]
    const c = codes(checkInput({ lines, itemPrices: { 'MAT-X': 1100 } }))
    expect(c).toContain('PRICE_STALE')
    expect(c).toContain('ACTUAL_MISSING')
    expect(c).toContain('VARIANCE_HIGH')
    const ok = [...checkInput().lines, baseLine({ id: 'p', itemCode: 'MAT-X', unitPrice: 1000, actual: { min: 1, typ: 1050, max: 2000 } })]
    const c2 = codes(checkInput({ lines: ok, itemPrices: { 'MAT-X': 1000 }, actualCounts: { 'MAT-X': 3 } }))
    expect(c2).not.toContain('PRICE_STALE')
    expect(c2).not.toContain('ACTUAL_MISSING')
    expect(c2).not.toContain('VARIANCE_HIGH')
  })
  it('TONE: "~합니다" 근거문구 경고', () => {
    const lines = [...checkInput().lines, baseLine({ id: 't', basisText: '현장 기준으로 산정합니다.' })]
    expect(codes(checkInput({ lines }))).toContain('TONE')
  })
})
