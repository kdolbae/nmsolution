import { describe, expect, it } from 'vitest'
import { customerDocument, toCustomerDoc, type SourceSection } from '../print'
import { crewCompare, execSummary, settleSummary, varianceCandidates, type SettleLine, type SettleOrder } from '../settle'
import type { RateSet } from '../calc'

const RATE: RateSet = { mode: 'full', rates: { injury: 3.56, employment: 1.15, safety: 3.11, overhead: 5, profit: 15 }, truncateUnit: 1000, expensePerCrewDay: 50000 }

const sections: SourceSection[] = [
  {
    name: '인양',
    description: '',
    calcMode: 'full',
    isOption: false,
    lines: [
      { kind: '노무', name: '리거(도비)', spec: '', unit: '인·일', qty: 8, unitPrice: 300000, removed: false, confirmNeeded: false, basisText: '투입 인원 × 인양 일수로 산정함', grade: 'required', qtyRuleSnapshot: { type: 'people_days' }, internalMemo: 'SECRET_MEMO_X', actualTyp: 280000, actual: { min: 260000, typ: 280000, max: 300000 } },
      { kind: '노무', name: '신호수', spec: '', unit: '인·일', qty: 4, unitPrice: 180000, removed: false, confirmNeeded: false, basisText: '크레인 인양 시 신호수 배치 기준으로 산정함', grade: 'rule', qtyRuleSnapshot: { type: 'people_times_answer' } },
      { kind: '장비', name: '크레인 100t', spec: '', unit: '일', qty: 2, unitPrice: 2500000, removed: false, confirmNeeded: true, basisText: '인양 일수 기준 (협의 후 확정)', grade: 'basic', qtyRuleSnapshot: { type: 'answer' } },
      { kind: '자재', name: '와이어·슬링 세트', spec: '', unit: '식', qty: 1, unitPrice: 400000, removed: false, confirmNeeded: false, basisText: '1식으로 산정함', grade: 'required' },
      { kind: '경비', name: '현장 경비(안전·소모·운반)', spec: '', unit: '인·일', qty: 12, unitPrice: 50000, removed: false, confirmNeeded: false, basisText: '', grade: 'rule', qtyRuleSnapshot: { type: 'auto_expense' } },
      { kind: '경비', name: '현장 조사 및 공사 관리', spec: '', unit: '회', qty: 3, unitPrice: 350000, removed: false, confirmNeeded: false, basisText: '방문 횟수 기준으로 산정함', grade: 'manager', qtyRuleSnapshot: { type: 'visits' } },
      { kind: '자재', name: '삭제된줄_REMOVED', spec: '', unit: '식', qty: 1, unitPrice: 999, removed: true, confirmNeeded: false, basisText: '', grade: 'basic' },
    ],
  },
]

describe('고객 출력물', () => {
  const doc = toCustomerDoc({
    title: '변압기 이동',
    customerNumber: 'NM-2610-001-A안',
    date: '2026-10-16',
    validUntil: '2026-11-15',
    validDays: 30,
    recipient: { name: '샘플 발주처' },
    sections,
    rateSet: RATE,
    notesCustomer: '공사 기간: 협의',
    confirmText: '협의 후 확정',
    approved: true,
  })
  const html = customerDocument(doc, ['quote', 'detail', 'basis'])
  const body = html.replace(/<style>[\s\S]*?<\/style>/g, '')

  it('금액은 계산 엔진과 같음', () => {
    expect(doc.supply).toBe(12529000)
    expect(doc.total).toBe(13781900)
  })
  it('내부 정보가 없음(실단가·원가·이익·메모·등급·삭제 줄)', () => {
    expect(html).not.toContain('SECRET_MEMO_X')
    expect(html).not.toContain('280,000')
    expect(html).not.toContain('삭제된줄_REMOVED')
    for (const w of ['internal_memo', 'actual', 'margin', '원가', '이익', '인센티브', '실단가', '메모', '필수', '조건부', 'FIRE_WATCH', 'people_days']) expect(body).not.toContain(w)
    expect(JSON.stringify(doc)).not.toContain('SECRET_MEMO_X')
  })
  it('담당자 줄은 고객 단가로, 확인 필요 줄은 비고에 표기', () => {
    expect(html).toContain('현장 조사 및 공사 관리')
    expect(html).toContain('350,000')
    expect(html).toContain('협의 후 확정')
  })
  it('승인 전 판은 워터마크', () => {
    const draft = customerDocument({ ...doc, draft: true }, ['quote'])
    expect(draft).toContain('검토용(제출 불가)')
    expect(html).not.toContain('검토용(제출 불가)')
  })
})

describe('실행·정산 (§5.3 예제)', () => {
  const lines: SettleLine[] = [
    { id: 1, kind: '노무', name: '리거', itemCode: 'LAB-RIGGER', unit: '인·일', qty: 8, unitPrice: 300000, removed: false, grade: 'required', actual: { min: 260000, typ: 280000, max: 300000 } },
    { id: 2, kind: '노무', name: '신호수', itemCode: 'LAB-SIGNAL', unit: '인·일', qty: 4, unitPrice: 180000, removed: false, grade: 'rule', actual: { min: 150000, typ: 160000, max: 175000 } },
    { id: 3, kind: '장비', name: '크레인', itemCode: 'EQP-CRANE-100T', unit: '일', qty: 2, unitPrice: 2500000, removed: false, grade: 'basic', actual: { min: 2000000, typ: 2200000, max: 2600000 } },
    { id: 4, kind: '자재', name: '슬링', itemCode: 'MAT-SLING', unit: '식', qty: 1, unitPrice: 400000, removed: false, grade: 'required', actual: { min: 300000, typ: 350000, max: 420000 } },
    { id: 5, kind: '경비', name: '현장 경비', itemCode: null, unit: '인·일', qty: 12, unitPrice: 50000, removed: false, grade: 'rule' },
    { id: 6, kind: '경비', name: '담당자', itemCode: 'MGR-SITE', unit: '회', qty: 3, unitPrice: 350000, removed: false, grade: 'manager' },
  ]
  const orders: SettleOrder[] = [
    { id: 1, lineId: 3, itemCode: 'EQP-CRANE-100T', kind: '장비', name: '크레인', qty: 2, plannedAmount: 4400000, orderedAmount: 4200000, status: 'done' },
    { id: 2, lineId: 1, itemCode: 'LAB-RIGGER', kind: '노무', name: '리거', qty: 8, plannedAmount: 2240000, orderedAmount: 2300000, status: 'done' },
  ]
  it('실행이익 3,016,178 · 절충이익 140,000', () => {
    const r = execSummary({ supply: 12529000, lines, orders, insurance: 146952, managerCost: 900000, incentive: 375870 })
    expect(r.negotiationGain).toBe(140000)
    expect(r.profit).toBe(3016178)
  })
  it('최종이익 2,833,130', () => {
    const r = settleSummary({
      supply: 12529000,
      receipts: [{ kind: 'advance', amount: 6000000 }, { kind: 'balance', amount: 6529000 }],
      payments: [{ kind: '장비', amount: 4200000 }, { kind: '노무', amount: 3920000 }],
      managerDays: 4,
      managerRate: 300000,
      incentiveCfg: { basis: 'supply_pct', pct: 3, fixed: 0 },
    })
    expect(r.paidTotal).toBe(8120000)
    expect(r.managerCost).toBe(1200000)
    expect(r.incentiveAmount).toBe(375870)
    expect(r.finalProfit).toBe(2833130)
  })
  it('실투입 13 vs 견적 12 → +1', () => {
    const c = crewCompare(lines, [{ itemCode: 'LAB-RIGGER', headcount: 4 }, { itemCode: 'LAB-RIGGER', headcount: 5 }, { itemCode: 'LAB-SIGNAL', headcount: 4 }])
    expect(c.totalEst).toBe(12)
    expect(c.totalAct).toBe(13)
    expect(c.diff).toBe(1)
  })
  it('단가 차이 후보(기준 10%)', () => {
    const v = varianceCandidates(lines, orders, 10)
    const crane = v.find((x) => x.itemCode === 'EQP-CRANE-100T')!
    expect(crane.actualPrice).toBe(2100000)
    expect(crane.variancePct).toBe(-16)
    expect(crane.flagged).toBe(true)
    expect(v.find((x) => x.itemCode === 'LAB-RIGGER')!.flagged).toBe(false)
  })
})
