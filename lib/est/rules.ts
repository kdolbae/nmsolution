/**
 * 체크리스트 답 → 조건 평가·수량 계산·자동 초안 (순수 함수).
 * 템플릿 항목(필수·기본·조건부) + 규칙표(est_rule) + 현장 답(est_check_answer) 으로 견적 줄을 만듦.
 */
import { AUTO_EXPENSE_NAME, defaultExpense, type ActualRange, type Kind, type Line, type RateSet } from './calc'

export type Answers = Record<string, unknown>

export type CondOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'truthy'
export type Condition =
  | { question: string; op: CondOp; value?: unknown }
  | { all: Condition[] }
  | { any: Condition[] }

export function isAnswered(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  return true
}

const asNum = (v: unknown): number | null => {
  if (typeof v === 'boolean') return null
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

function same(a: unknown, b: unknown): boolean {
  if (typeof a === 'boolean' || typeof b === 'boolean') return truthy(a) === truthy(b)
  const na = asNum(a)
  const nb = asNum(b)
  if (na !== null && nb !== null) return na === nb
  return String(a) === String(b)
}

function truthy(v: unknown): boolean {
  if (typeof v === 'string') return v !== '' && v !== 'false' && v !== '0'
  if (Array.isArray(v)) return v.length > 0
  return Boolean(v)
}

/** 조건 질문 코드 모음(미답 검사용) */
export function conditionQuestions(c: Condition | null | undefined): string[] {
  if (!c) return []
  if ('all' in c) return c.all.flatMap(conditionQuestions)
  if ('any' in c) return c.any.flatMap(conditionQuestions)
  return [c.question]
}

/**
 * 조건 평가. 참 true, 거짓 false, 답이 없어 판단 못 하면 null.
 * all: 하나라도 거짓이면 거짓, 모두 참이면 참, 그 밖은 null. any 는 그 반대.
 */
export function evalCondition(c: Condition | null | undefined, answers: Answers): boolean | null {
  if (!c) return true
  if ('all' in c) {
    const rs = c.all.map((x) => evalCondition(x, answers))
    if (rs.includes(false)) return false
    return rs.every((r) => r === true) ? true : null
  }
  if ('any' in c) {
    const rs = c.any.map((x) => evalCondition(x, answers))
    if (rs.includes(true)) return true
    return rs.every((r) => r === false) ? false : null
  }
  const v = answers[c.question]
  if (!isAnswered(v)) return null
  switch (c.op) {
    case 'eq':
      return same(v, c.value)
    case 'ne':
      return !same(v, c.value)
    case 'truthy':
      return truthy(v)
    case 'in':
      return Array.isArray(c.value) ? c.value.some((x) => (Array.isArray(v) ? v.some((y) => same(x, y)) : same(x, v))) : false
    default: {
      const a = asNum(v)
      const b = asNum(c.value)
      if (a === null || b === null) return null
      if (c.op === 'gt') return a > b
      if (c.op === 'gte') return a >= b
      if (c.op === 'lt') return a < b
      return a <= b
    }
  }
}

// ---------- 수량 ----------

export type QtyRule =
  | { type: 'fixed'; qty: number }
  | { type: 'area_factor'; question: string; factor: number; round?: 'up' | 'nearest' | 'none' }
  | { type: 'people_days'; people_q?: string; people?: number; days_q?: string; days?: number }
  | { type: 'rule'; rule_code: string }
  | { type: 'answer'; question: string }
  | { type: 'answer_mul'; question: string; factor: number }
  | { type: 'people_times_answer'; people: number; question: string }
  | { type: 'visits' }

export type QtyResult = {
  qty: number | null
  confirmNeeded: boolean
  /** 수량이 어떻게 나왔는지(est_line.qty_rule_snapshot) */
  snapshot: { type: string; inputs: Record<string, unknown>; result: number | null }
}

/** 품목 qty_rule_type + qty_rule(jsonb) 을 하나의 규칙으로 */
export function toQtyRule(type: string | null | undefined, rule: unknown): QtyRule {
  const r = (rule && typeof rule === 'object' ? rule : {}) as Record<string, unknown>
  return { ...(r as object), type: (type || (r.type as string) || 'fixed') } as QtyRule
}

function ans(answers: Answers, q: string | undefined): number | null {
  if (!q) return null
  return asNum(answers[q])
}

/**
 * 수량 계산. 답이 없으면 qty null + confirmNeeded(고객 서류에 "협의 후 확정").
 * ctx.visits: 담당자 방문 수(visits 규칙).
 */
export function qtyFromRule(rule: QtyRule, answers: Answers, ctx: { visits?: number } = {}): QtyResult {
  const out = (qty: number | null, inputs: Record<string, unknown>): QtyResult => ({
    qty,
    confirmNeeded: qty === null,
    snapshot: { type: rule.type, inputs, result: qty },
  })
  switch (rule.type) {
    case 'fixed':
      return out(Number(rule.qty ?? 1), { qty: rule.qty ?? 1 })
    case 'visits':
      return out(Math.max(0, Number(ctx.visits ?? 0)), { visits: ctx.visits ?? 0 })
    case 'area_factor': {
      const a = ans(answers, rule.question)
      if (a === null) return out(null, { [rule.question]: null, factor: rule.factor })
      const raw = a * Number(rule.factor)
      const round = rule.round ?? 'up'
      // 부동소수 오차(123×0.05=6.1500000001 등) 정리 후 올림
      const clean = Math.round(raw * 1e6) / 1e6
      const q = round === 'up' ? Math.ceil(clean) : round === 'nearest' ? Math.round(clean) : clean
      return out(q, { [rule.question]: a, factor: rule.factor, round })
    }
    case 'people_days': {
      const p = rule.people != null ? Number(rule.people) : ans(answers, rule.people_q)
      const d = rule.days != null ? Number(rule.days) : ans(answers, rule.days_q)
      const inputs = { people: p, days: d, people_q: rule.people_q, days_q: rule.days_q }
      return out(p === null || d === null ? null : p * d, inputs)
    }
    case 'answer': {
      const a = ans(answers, rule.question)
      return out(a, { [rule.question]: a })
    }
    case 'answer_mul': {
      const a = ans(answers, rule.question)
      return out(a === null ? null : Math.round(a * Number(rule.factor ?? 1) * 1000) / 1000, { [rule.question]: a, factor: rule.factor })
    }
    case 'people_times_answer': {
      const a = ans(answers, rule.question)
      return out(a === null ? null : Number(rule.people) * a, { people: rule.people, [rule.question]: a })
    }
    case 'rule':
    default:
      // 규칙 수량은 규칙 action 이 정함. 규칙이 안 걸리면 미정
      return out(null, { rule_code: (rule as { rule_code?: string }).rule_code })
  }
}

/** 규칙 action.qty → 수량 규칙. {type:'answer_mul', question, factor} 등 */
export function ruleActionQty(q: unknown): QtyRule {
  const r = (q && typeof q === 'object' ? q : { type: 'fixed', qty: 1 }) as Record<string, unknown>
  return r as unknown as QtyRule
}

// ---------- 자동 초안 ----------

export type Grade = 'required' | 'basic' | 'conditional' | 'rule' | 'manual' | 'manager'
export type RemovedReason = 'not_applicable' | 'client_provides' | 'separate_contract' | 'other'

export type ItemMaster = {
  code: string
  kind: Kind
  name: string
  spec: string
  unit: string
  price: number
  basisText: string
  internalMemo: string
  qtyRuleType: string
  qtyRule: unknown
  class3Id: number | null
  actual?: ActualRange | null
  actualSource?: string | null
}

export type TemplateItem = {
  itemCode: string
  grade: 'required' | 'basic' | 'conditional'
  condition?: Condition | null
  /** 기본 항목의 자동 삭제 제안 {question, op, value, reason} */
  removeIf?: (Condition & { reason?: RemovedReason; note?: string }) | null
  qtyRuleType?: string | null
  qtyRule?: unknown
  class3Id?: number | null
  sortOrder: number
}

export type RuleDef = {
  code: string
  name: string
  condition: Condition
  action: { add_item?: string; class3_code?: string; qty?: unknown }
  message?: string | null
  severity: 'error' | 'warn'
}

export type DraftLine = {
  itemCode: string | null
  kind: Kind
  name: string
  spec: string
  unit: string
  qty: number
  unitPrice: number
  grade: Grade
  origin: 'template' | 'rule' | 'manual' | 'manager'
  qtyRuleSnapshot: QtyResult['snapshot'] | { type: string } | null
  basisText: string
  internalMemo: string
  confirmNeeded: boolean
  removed: boolean
  removedReason: RemovedReason | null
  removedNote: string | null
  actual: ActualRange | null
  actualSource: string | null
  crewDays: number | null
}

export type DraftSection = { class3Id: number | null; name: string; lines: DraftLine[] }

export type DraftInput = {
  templateItems: TemplateItem[]
  items: Record<string, ItemMaster>
  rules: RuleDef[]
  answers: Answers
  /** 현장에서 확인 못 한 질문 코드 */
  confirmNeeded?: string[]
  /** class3 id → {code, name, sort} */
  classes: Record<number, { code: string; name: string; sort: number }>
  manager: { itemCode: string; visits: number; dayRateCustomer: number; kind: Kind; lineName: string }
  rateSet: RateSet
  confirmText: string
}

export type DraftResult = { sections: DraftSection[]; notes: string[] }

function lineFromItem(it: ItemMaster, grade: Grade, origin: DraftLine['origin'], q: QtyResult, confirmText: string, extraConfirm: boolean): DraftLine {
  const confirm = q.confirmNeeded || extraConfirm
  const qty = q.qty ?? 0
  return {
    itemCode: it.code,
    kind: it.kind,
    name: it.name,
    spec: it.spec,
    unit: it.unit,
    qty,
    unitPrice: it.price,
    grade,
    origin,
    qtyRuleSnapshot: q.snapshot,
    basisText: confirm && !it.basisText.includes(confirmText) ? `${it.basisText}${it.basisText ? ' ' : ''}(${confirmText})` : it.basisText,
    internalMemo: it.internalMemo,
    confirmNeeded: confirm,
    removed: false,
    removedReason: null,
    removedNote: null,
    actual: it.actual ?? null,
    actualSource: it.actualSource ?? null,
    crewDays: it.kind === '노무' ? qty : null,
  }
}

/** 수량 계산에 쓴 질문 중 현장에서 "확인 못함" 인 것이 있는지 */
function usesUnconfirmed(snapshot: QtyResult['snapshot'], unconfirmed: Set<string>): boolean {
  return Object.keys(snapshot.inputs).some((k) => unconfirmed.has(k)) ||
    ['people_q', 'days_q'].some((k) => typeof snapshot.inputs[k] === 'string' && unconfirmed.has(snapshot.inputs[k] as string))
}

/**
 * 자동 초안: 템플릿 전체(필수·기본·조건부 평가) → 규칙 실행 → 수량 → 담당자 줄 → 경비 자동 줄.
 * 조건부 항목은 조건이 참일 때만 넣음(답이 없으면 빼고 알림). 기본 항목의 removeIf 가 참이면 삭제 제안(삭제 상태로 넣음).
 */
export function buildDraft(input: DraftInput): DraftResult {
  const notes: string[] = []
  const unconfirmed = new Set(input.confirmNeeded ?? [])
  const sections = new Map<string, DraftSection>()
  const order: string[] = []
  const sectionFor = (class3Id: number | null | undefined) => {
    const key = class3Id ? String(class3Id) : 'none'
    let s = sections.get(key)
    if (!s) {
      const c = class3Id ? input.classes[class3Id] : undefined
      s = { class3Id: class3Id ?? null, name: c?.name ?? '공사', lines: [] }
      sections.set(key, s)
      order.push(key)
    }
    return s
  }
  const has = (code: string) => [...sections.values()].some((s) => s.lines.some((l) => l.itemCode === code))

  const ruleByCode = new Map(input.rules.map((r) => [r.code, r]))

  const sorted = [...input.templateItems].sort((a, b) => a.sortOrder - b.sortOrder)
  for (const ti of sorted) {
    const it = input.items[ti.itemCode]
    if (!it) {
      notes.push(`템플릿 품목 ${ti.itemCode} 이 마스터에 없어 뺌`)
      continue
    }
    const class3 = ti.class3Id ?? it.class3Id
    // 담당자 품목은 담당자 줄로
    if (it.code === input.manager.itemCode || (ti.qtyRuleType ?? it.qtyRuleType) === 'visits') {
      sectionFor(class3).lines.push(managerDraftLine(input.manager, it))
      continue
    }
    if (ti.grade === 'conditional') {
      const ok = evalCondition(ti.condition ?? null, input.answers)
      if (ok === null) {
        notes.push(`${it.name}: 조건 질문에 답이 없어 넣지 않음`)
        continue
      }
      if (!ok) continue
    }
    const rule = toQtyRule(ti.qtyRuleType ?? it.qtyRuleType, ti.qtyRule ?? it.qtyRule)
    let q: QtyResult
    if (rule.type === 'rule') {
      const r = ruleByCode.get(rule.rule_code)
      q = r ? qtyFromRule(ruleActionQty(r.action.qty), input.answers, { visits: input.manager.visits }) : qtyFromRule(rule, input.answers)
    } else {
      q = qtyFromRule(rule, input.answers, { visits: input.manager.visits })
    }
    const line = lineFromItem(it, ti.grade, 'template', q, input.confirmText, usesUnconfirmed(q.snapshot, unconfirmed))
    if (ti.grade === 'basic' && ti.removeIf && evalCondition(ti.removeIf, input.answers) === true) {
      line.removed = true
      line.removedReason = ti.removeIf.reason ?? 'not_applicable'
      line.removedNote = ti.removeIf.note ?? '현장 확인 답으로 자동 제안'
    }
    sectionFor(class3).lines.push(line)
  }

  // 규칙: 조건이 참이고 action 품목이 아직 없으면 넣음
  for (const r of input.rules) {
    if (!r.action.add_item) continue
    if (evalCondition(r.condition, input.answers) !== true) continue
    if (has(r.action.add_item)) continue
    const it = input.items[r.action.add_item]
    if (!it) {
      notes.push(`규칙 ${r.code}: 품목 ${r.action.add_item} 이 마스터에 없음`)
      continue
    }
    const q = qtyFromRule(ruleActionQty(r.action.qty), input.answers, { visits: input.manager.visits })
    // 규칙이 가리킨 공정(또는 품목 기본 공정)이 이 초안에 있으면 그곳, 없으면 마지막 공정
    const c3 = r.action.class3_code
      ? Number(Object.entries(input.classes).find(([, c]) => c.code === r.action.class3_code)?.[0]) || it.class3Id
      : it.class3Id
    const target = c3 && sections.has(String(c3)) ? sections.get(String(c3))! : order.length ? sections.get(order[order.length - 1])! : sectionFor(c3)
    target.lines.push(lineFromItem(it, 'rule', 'rule', q, input.confirmText, usesUnconfirmed(q.snapshot, unconfirmed)))
  }

  // 담당자 줄이 템플릿에 없으면 마지막 공정에 넣음
  const all = () => [...sections.values()].flatMap((s) => s.lines)
  if (!all().some((l) => l.grade === 'manager')) {
    const target = order.length ? sections.get(order[order.length - 1])! : sectionFor(null)
    target.lines.push(managerDraftLine(input.manager, null))
  }

  // 경비 자동 줄
  const auto = defaultExpense(all().map(toCalcLine), input.rateSet)
  if (auto) {
    const target = sections.get(order[order.length - 1])!
    target.lines.push(autoExpenseDraftLine(auto.qty, auto.unitPrice))
  }

  const out = order
    .map((k) => sections.get(k)!)
    .sort((a, b) => (a.class3Id ? input.classes[a.class3Id]?.sort ?? 0 : 9999) - (b.class3Id ? input.classes[b.class3Id]?.sort ?? 0 : 9999))
  return { sections: out, notes }
}

function managerDraftLine(m: DraftInput['manager'], it: ItemMaster | null): DraftLine {
  return {
    itemCode: it?.code ?? null,
    kind: m.kind,
    name: m.lineName,
    spec: it?.spec ?? '',
    unit: it?.unit ?? '회',
    qty: m.visits,
    unitPrice: m.dayRateCustomer,
    grade: 'manager',
    origin: 'manager',
    qtyRuleSnapshot: { type: 'visits', inputs: { visits: m.visits }, result: m.visits },
    basisText: it?.basisText ?? '현장 조사·공정 관리 방문 횟수 기준으로 산정함',
    internalMemo: '',
    confirmNeeded: false,
    removed: false,
    removedReason: null,
    removedNote: null,
    actual: null,
    actualSource: null,
    crewDays: null,
  }
}

export function autoExpenseDraftLine(qty: number, unitPrice: number): DraftLine {
  return {
    itemCode: null,
    kind: '경비',
    name: AUTO_EXPENSE_NAME,
    spec: '',
    unit: '인·일',
    qty,
    unitPrice,
    grade: 'rule',
    origin: 'rule',
    qtyRuleSnapshot: { type: 'auto_expense' },
    basisText: '투입 인·일 기준 안전·소모품·운반 경비로 산정함',
    internalMemo: '',
    confirmNeeded: false,
    removed: false,
    removedReason: null,
    removedNote: null,
    actual: null,
    actualSource: null,
    crewDays: null,
  }
}

export function isAutoExpenseSnapshot(s: unknown): boolean {
  return !!s && typeof s === 'object' && (s as { type?: string }).type === 'auto_expense'
}

/** 초안 줄 → 계산 줄 */
export function toCalcLine(l: DraftLine, i = 0): Line {
  return {
    id: String(i),
    kind: l.kind,
    qty: l.qty,
    unitPrice: l.unitPrice,
    removed: l.removed,
    crewDays: l.crewDays,
    actual: l.actual,
    grade: l.grade,
    isManager: l.grade === 'manager',
    isAutoExpense: isAutoExpenseSnapshot(l.qtyRuleSnapshot),
  }
}

/** 고객 문구의 문장 끝이 "~합니다" 류인지(문체 경고) */
export function politeEnding(text: string): boolean {
  return /(합니다|됩니다|입니다|습니다)[.。]?\s*$/m.test(text)
}
