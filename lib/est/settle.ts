/**
 * 실행·정산 계산 (순수 함수). 실행이익·절충이익·최종이익·인센티브·단가 차이 후보·인·일 비교.
 */
import { execProfit, finalProfit, incentive, lineCost, variancePct, type IncentiveCfg, type Kind } from './calc'
import { toCalcLine, type LineLike } from './compute'

export type SettleLine = LineLike & { name: string; itemCode: string | null; unit: string; isOption?: boolean }
export type SettleOrder = { id: number; lineId: number | null; itemCode: string | null; kind: Kind; name: string; qty: number; plannedAmount: number; orderedAmount: number; status: string }

/** 줄의 예상원가 typ (발주 계획금액 기본값) */
export function lineTypCost(l: LineLike): number {
  return lineCost(toCalcLine(l)).typ
}

export function execSummary(input: { supply: number; lines: SettleLine[]; orders: SettleOrder[]; insurance: number; managerCost: number; incentive: number }) {
  return execProfit({
    supply: input.supply,
    lines: input.lines.filter((l) => !l.removed && l.grade !== 'manager' && !l.isOption).map((l) => ({ lineId: String(l.id), typ: lineTypCost(l) })),
    orders: input.orders.map((o) => ({ lineId: o.lineId ? String(o.lineId) : null, planned: o.plannedAmount, ordered: o.orderedAmount, status: o.status })),
    fixedCost: input.insurance,
    managerCost: input.managerCost,
    incentive: input.incentive,
  })
}

export function settleSummary(input: {
  supply: number
  receipts: { kind: string; amount: number }[]
  payments: { kind: string; amount: number }[]
  managerDays: number
  managerRate: number
  incentiveCfg: Pick<IncentiveCfg, 'basis' | 'pct' | 'fixed'>
}) {
  const receivedTotal = input.receipts.reduce((a, r) => a + (r.kind === 'refund' ? -r.amount : r.amount), 0)
  const paidTotal = input.payments.filter((p) => p.kind !== '담당자' && p.kind !== '인센티브').reduce((a, p) => a + p.amount, 0)
  const managerCost = Math.round(input.managerDays * input.managerRate)
  const before = receivedTotal - paidTotal - managerCost
  const incentiveAmount = incentive(input.incentiveCfg, input.supply, before)
  return {
    receivedTotal,
    paidTotal,
    managerCost,
    incentiveAmount,
    profitBeforeIncentive: before,
    finalProfit: finalProfit(receivedTotal, input.payments, managerCost, incentiveAmount),
  }
}

export type VarianceCandidate = { itemCode: string; name: string; estimatePrice: number; actualPrice: number; variancePct: number; orderId: number }

/** 완료 발주의 실단가(발주금액 ÷ 수량) vs 견적단가. 차이 % ≥ 기준이면 후보 */
export function varianceCandidates(lines: SettleLine[], orders: SettleOrder[], highlightPct: number): (VarianceCandidate & { flagged: boolean })[] {
  const out: (VarianceCandidate & { flagged: boolean })[] = []
  for (const o of orders) {
    if (o.status !== 'done' || !o.itemCode || !(o.qty > 0)) continue
    const line = lines.find((l) => l.id === o.lineId) ?? lines.find((l) => l.itemCode === o.itemCode && !l.removed)
    if (!line || !line.unitPrice) continue
    const actual = Math.round(o.orderedAmount / o.qty)
    const pct = variancePct(line.unitPrice, actual)
    if (pct === null) continue
    out.push({ itemCode: o.itemCode, name: line.name, estimatePrice: line.unitPrice, actualPrice: actual, variancePct: pct, orderId: o.id, flagged: Math.abs(pct) >= highlightPct })
  }
  return out
}

/** 견적 인·일 vs 실투입 인·일(품목별) */
export function crewCompare(lines: SettleLine[], crew: { itemCode: string | null; headcount: number }[]) {
  const est = new Map<string, { name: string; days: number }>()
  for (const l of lines) {
    if (l.removed || l.kind !== '노무') continue
    const k = l.itemCode ?? `line:${l.id}`
    const cur = est.get(k) ?? { name: l.name, days: 0 }
    cur.days += Number(l.crewDays ?? l.qty) || 0
    est.set(k, cur)
  }
  const act = new Map<string, number>()
  for (const c of crew) act.set(c.itemCode ?? '', (act.get(c.itemCode ?? '') ?? 0) + c.headcount)
  const keys = [...new Set([...est.keys(), ...act.keys()])]
  const rows = keys.map((k) => {
    const e = est.get(k)?.days ?? 0
    const a = act.get(k) ?? 0
    return { key: k, name: est.get(k)?.name ?? (k ? k : '품목 미지정'), estimate: e, actual: a, diff: Math.round((a - e) * 10) / 10 }
  })
  const totalEst = rows.reduce((s, r) => s + r.estimate, 0)
  const totalAct = rows.reduce((s, r) => s + r.actual, 0)
  return { rows, totalEst, totalAct, diff: Math.round((totalAct - totalEst) * 10) / 10 }
}
