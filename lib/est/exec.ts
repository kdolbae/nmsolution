/**
 * 실행·정산 화면과 정산 마감이 함께 쓰는 DB 읽기 + 계산(lib/est/settle.ts). 서버 액션이 아님(권한 확인은 부르는 쪽).
 */
import { pool } from '@/lib/db'
import { computeEstimate } from './compute'
import { getEstimateDetail, getProject, listCrewDays, listOrders, listPayments, listReceipts, listVisits } from './data'
import { getSettings } from './settings'
import { sNum } from './settings-defaults'
import { execSummary, settleSummary, varianceCandidates, type SettleLine } from './settle'
import { n } from './table'
import type { Kind } from './calc'

/** 실행 기준 판: 제출(수주)된 판 → 대표 판 */
export async function execEstimateId(projectId: number): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT id FROM est_estimate WHERE project_id = $1 AND status = 'submitted' ORDER BY submitted_at DESC NULLS LAST, id DESC LIMIT 1`,
    [projectId],
  )
  if (rows[0]) return n(rows[0].id)
  const p = await getProject(projectId)
  return p?.currentEstimateId ?? null
}

/** 정산에 쓰는 숫자 모음(화면·마감 공용) */
export async function settlementNumbers(projectId: number) {
  const settings = await getSettings()
  const estimateId = await execEstimateId(projectId)
  const d = estimateId ? await getEstimateDetail(estimateId) : null
  const [orders, receipts, payments, visits, crew, st] = await Promise.all([
    listOrders(projectId),
    listReceipts(projectId),
    listPayments(projectId),
    listVisits(projectId),
    listCrewDays(projectId),
    pool.query(`SELECT manager_days, manager_days_overridden FROM est_settlement WHERE project_id = $1`, [projectId]),
  ])
  const autoDays = visits.filter((v) => v.countsAsManagerDay).length
  const overridden = Boolean(st.rows[0]?.manager_days_overridden)
  const managerDays = overridden ? n(st.rows[0].manager_days) : autoDays
  const supply = d?.estimate.supply ?? 0
  const snap = d?.estimate.settingsSnap
  const lines: SettleLine[] = d ? d.sections.filter((x) => !x.isOption).flatMap((x) => x.lines.map((l) => ({ ...l, isOption: x.isOption }))) : []
  const comp = d ? computeEstimate({ rateSnap: d.estimate.rateSnap, settingsSnap: d.estimate.settingsSnap, managerVisits: d.estimate.managerVisits, sections: d.sections }) : null
  const managerRate = snap?.manager.dayRateInternal ?? sNum(settings, 'manager.day_rate_internal')
  const incentiveCfg = snap?.incentive ?? { basis: 'supply_pct' as const, pct: sNum(settings, 'incentive.pct'), fixed: sNum(settings, 'incentive.fixed') }
  const settle = settleSummary({ supply, receipts, payments, managerDays, managerRate, incentiveCfg })
  const exec = execSummary({
    supply,
    lines,
    orders: orders.map((o) => ({ ...o, kind: o.kind as Kind })),
    insurance: comp?.cost.insurance ?? 0,
    managerCost: comp?.cost.manager ?? 0,
    incentive: comp?.cost.incentive ?? 0,
  })
  const variance = varianceCandidates(lines, orders.map((o) => ({ ...o, kind: o.kind as Kind })), sNum(settings, 'variance.highlight_pct'))
  return { estimateId, supply, lines, orders, receipts, payments, crew, visits, autoDays, managerDays, overridden, managerRate, settle, exec, variance, expected: comp }
}

