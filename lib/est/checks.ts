/**
 * 자동 검사 (기획서 §7.3, 순수 함수). error 가 0 건이어야 결재를 올릴 수 있음.
 */
import { variancePct, type ActualRange, type Kind } from './calc'
import { conditionQuestions, evalCondition, isAnswered, politeEnding, type Answers, type Condition, type RuleDef } from './rules'
import { sArr, sNum, sStr, type Settings } from './settings-defaults'

export type Severity = 'error' | 'warn'
export type CheckResult = { code: string; severity: Severity; message: string; lineId?: string }

export type CheckLine = {
  id: string
  itemCode: string | null
  kind: Kind
  name: string
  spec: string
  basisText: string
  qty: number
  unitPrice: number
  grade: string
  removed: boolean
  confirmNeeded: boolean
  actual?: ActualRange | null
  isManager?: boolean
  isAutoExpense?: boolean
}

export type CheckInput = {
  managerCount: number
  managerVisits: number
  lines: CheckLine[]
  notesCustomer: string
  answers: Answers
  rules: RuleDef[]
  conditionalItems: { itemCode: string; name: string; condition: Condition | null }[]
  /** 품목 현재 견적단가 */
  itemPrices: Record<string, number>
  /** 품목 실단가 관측 수 */
  actualCounts: Record<string, number>
  marginPct: number
  settings: Settings
}

export const CHECK_LABELS: Record<string, string> = {
  NO_MANAGER: '담당자 없음',
  MANAGER_VISITS: '담당자 방문 수',
  REQUIRED_REMOVED: '필수 항목 삭제',
  RULE_MISSING: '규칙 항목 누락',
  RULE_NOTICE: '규칙 알림',
  RULE_QTY_ZERO: '규칙 수량 0',
  MARGIN_LOW: '이익률 미달',
  INTERNAL_WORDS: '내부 용어',
  CONFIRM_TEXT: '확인 필요 표기',
  UNANSWERED_CONDITION: '조건 미답',
  NO_EXPENSE: '경비 없음',
  PRICE_STALE: '단가 변경',
  ACTUAL_MISSING: '실단가 없음',
  VARIANCE_HIGH: '단가 차이',
  TONE: '문체',
}

export function runChecks(c: CheckInput): CheckResult[] {
  const out: CheckResult[] = []
  const s = c.settings
  const live = c.lines.filter((l) => !l.removed)

  if (c.managerCount < 1) out.push({ code: 'NO_MANAGER', severity: 'error', message: '프로젝트 담당자가 없음. 개요에서 담당자를 지정해야 함' })

  const minVisits = sNum(s, 'manager.min_visits')
  if (c.managerVisits < minVisits || !live.some((l) => l.isManager)) {
    out.push({ code: 'MANAGER_VISITS', severity: 'error', message: `담당자 방문 수가 ${minVisits}회 미만이거나 담당자 줄이 없음` })
  }

  for (const l of c.lines) {
    if (l.removed && l.grade === 'required') out.push({ code: 'REQUIRED_REMOVED', severity: 'error', message: `필수 항목 "${l.name}" 이 삭제됨`, lineId: l.id })
  }

  for (const r of c.rules) {
    if (evalCondition(r.condition, c.answers) !== true) continue
    if (r.action.add_item) {
      if (!live.some((l) => l.itemCode === r.action.add_item)) {
        out.push({ code: 'RULE_MISSING', severity: r.severity, message: r.message || `${r.name}: 필요한 항목이 없음` })
      }
    } else if (r.message) {
      out.push({ code: 'RULE_NOTICE', severity: r.severity, message: r.message })
    }
  }

  for (const l of live) {
    if (l.grade === 'rule' && !l.isAutoExpense && !(Number(l.qty) > 0)) {
      out.push({ code: 'RULE_QTY_ZERO', severity: 'error', message: `규칙 항목 "${l.name}" 의 수량이 0 임`, lineId: l.id })
    }
  }

  const minMargin = sNum(s, 'profit.min_margin_pct')
  if (c.marginPct < minMargin) {
    const sev = sStr(s, 'profit.min_margin_severity') === 'error' ? 'error' : 'warn'
    out.push({ code: 'MARGIN_LOW', severity: sev, message: `예상이익률(대표값)이 ${minMargin}% 미만임` })
  }

  const words = sArr(s, 'doc.internal_words').filter(Boolean)
  const hit = (t: string) => words.find((w) => t.includes(w))
  for (const l of live) {
    const w = hit(`${l.name} ${l.spec} ${l.basisText}`)
    if (w) out.push({ code: 'INTERNAL_WORDS', severity: 'error', message: `"${l.name}" 고객 문구에 내부 용어 "${w}" 가 있음`, lineId: l.id })
  }
  const wn = hit(c.notesCustomer)
  if (wn) out.push({ code: 'INTERNAL_WORDS', severity: 'error', message: `특기사항에 내부 용어 "${wn}" 가 있음` })

  const confirmText = sStr(s, 'doc.confirm_needed_text')
  for (const l of live) {
    if (l.confirmNeeded && !l.basisText.includes(confirmText)) {
      out.push({ code: 'CONFIRM_TEXT', severity: 'error', message: `"${l.name}" 은 확인 필요 항목인데 근거문구에 "${confirmText}" 가 없음`, lineId: l.id })
    }
  }

  for (const ci of c.conditionalItems) {
    const qs = conditionQuestions(ci.condition).filter((q) => !isAnswered(c.answers[q]))
    if (qs.length) out.push({ code: 'UNANSWERED_CONDITION', severity: 'warn', message: `조건부 항목 "${ci.name}" 의 조건 질문(${qs.join(', ')})에 답이 없음` })
  }

  if (!live.some((l) => l.kind === '경비' && !l.isManager)) out.push({ code: 'NO_EXPENSE', severity: 'warn', message: '경비 줄이 없음' })

  const seenActual = new Set<string>()
  const highlight = sNum(s, 'variance.highlight_pct')
  for (const l of live) {
    if (!l.itemCode || l.isManager || l.isAutoExpense) continue
    const cur = c.itemPrices[l.itemCode]
    if (cur !== undefined && cur !== l.unitPrice) {
      out.push({ code: 'PRICE_STALE', severity: 'warn', message: `"${l.name}" 단가가 품목 현재 단가(${cur.toLocaleString('ko-KR')}원)와 다름`, lineId: l.id })
    }
    if (!seenActual.has(l.itemCode) && !c.actualCounts[l.itemCode]) {
      seenActual.add(l.itemCode)
      out.push({ code: 'ACTUAL_MISSING', severity: 'warn', message: `"${l.name}" 실단가 관측이 없어 견적단가로 원가를 셈`, lineId: l.id })
    }
    if (l.actual) {
      const v = variancePct(l.unitPrice, l.actual.typ)
      if (v !== null && Math.abs(v) >= highlight) {
        out.push({ code: 'VARIANCE_HIGH', severity: 'warn', message: `"${l.name}" 견적단가와 실단가 차이 ${v}%`, lineId: l.id })
      }
    }
  }

  for (const l of live) {
    if (l.basisText && politeEnding(l.basisText)) out.push({ code: 'TONE', severity: 'warn', message: `"${l.name}" 근거문구를 "~함" 으로 끝내야 함`, lineId: l.id })
  }

  return out
}

export function checkPassed(results: CheckResult[]): boolean {
  return !results.some((r) => r.severity === 'error')
}

/** CONFIRM_TEXT 자동 보정: 근거문구 끝에 확인 필요 문구를 붙임 */
export function withConfirmText(basis: string, confirmText: string): string {
  if (basis.includes(confirmText)) return basis
  return `${basis}${basis ? ' ' : ''}(${confirmText})`
}
