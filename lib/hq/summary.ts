import { pool } from '@/lib/db'
import { ensureEst, n } from '@/lib/est/table'
import { getSettings } from '@/lib/est/settings'
import { sBool } from '@/lib/est/settings-defaults'
import type { HqKpis } from './kpi-keys'

/** 본사 요약 KPI(사업부 → 본사). 기간 지표 = 제출·수주·실패, 나머지는 지금 상태 */
export async function hqKpis(from: string, to: string): Promise<HqKpis> {
  await ensureEst()
  const settings = await getSettings()
  const { rows } = await pool.query(
    `WITH live AS (SELECT * FROM est_project WHERE deleted_at IS NULL),
     sub AS (
       SELECT DISTINCT e.id, e.supply FROM est_submission s JOIN est_estimate e ON e.id = s.estimate_id JOIN live p ON p.id = e.project_id
       WHERE (s.submitted_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
     ),
     won AS (
       SELECT p.id, COALESCE(st.final_supply, e.supply, 0) AS supply, COALESCE(e.expected_profit, 0) AS profit
       FROM live p LEFT JOIN est_settlement st ON st.project_id = p.id LEFT JOIN est_estimate e ON e.id = COALESCE(st.estimate_id, p.current_estimate_id)
       WHERE p.result = 'won' AND (p.result_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
     ),
     recv AS (
       SELECT p.id, COALESCE(st.final_supply, e.supply, 0) + COALESCE(e.vat, 0) AS billed,
              COALESCE((SELECT sum(CASE WHEN r.kind = 'refund' THEN -r.amount ELSE r.amount END) FROM est_receipt r WHERE r.project_id = p.id), 0) AS received
       FROM live p LEFT JOIN est_settlement st ON st.project_id = p.id LEFT JOIN est_estimate e ON e.id = COALESCE(st.estimate_id, p.current_estimate_id)
       WHERE p.stage IN ('WON','EXEC','SETTLE')
     )
     SELECT
       (SELECT count(*) FROM live WHERE stage NOT IN ('CLOSED','LOST','HOLD')) AS projects_open,
       (SELECT count(*) FROM live WHERE stage IN ('P1','P2')) AS site_checks_pending,
       (SELECT count(*) FROM est_estimate e JOIN live p ON p.id = e.project_id WHERE e.status = 'approving') AS estimates_in_approval,
       (SELECT count(*) FROM sub) AS estimates_submitted,
       (SELECT COALESCE(sum(supply), 0) FROM sub) AS submitted_amount,
       (SELECT count(*) FROM won) AS won_count,
       (SELECT COALESCE(sum(supply), 0) FROM won) AS won_amount,
       (SELECT COALESCE(sum(profit), 0) FROM won) AS won_profit,
       (SELECT count(*) FROM live WHERE result = 'lost' AND (result_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date) AS lost_count,
       (SELECT count(*) FROM live WHERE stage IN ('WON','EXEC')) AS exec_open,
       (SELECT count(*) FROM live WHERE stage = 'SETTLE') AS settle_open,
       (SELECT COALESCE(sum(GREATEST(billed - received, 0)), 0) FROM recv) AS receivable`,
    [from, to],
  )
  const r = rows[0]
  const wonAmount = n(r.won_amount)
  return {
    projects_open: n(r.projects_open),
    site_checks_pending: n(r.site_checks_pending),
    estimates_in_approval: n(r.estimates_in_approval),
    estimates_submitted: n(r.estimates_submitted),
    submitted_amount: n(r.submitted_amount),
    won_count: n(r.won_count),
    won_amount: wonAmount,
    lost_count: n(r.lost_count),
    exec_open: n(r.exec_open),
    settle_open: n(r.settle_open),
    receivable: n(r.receivable),
    margin_pct: sBool(settings, 'hq.share_profit') && wonAmount > 0 ? Math.round((n(r.won_profit) / wonAmount) * 1000) / 10 : null,
  }
}
