'use server'

import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { requireEst } from '@/lib/session'
import { act, idOf, int, num, str } from '@/lib/est/act'
import { atLeast, canSeeCost } from '@/lib/est/perm'
import { getSettings } from '@/lib/est/settings'
import { EstError, n } from '@/lib/est/table'
import { tx } from '@/lib/est/draft'
import { getEstimateDetail, getProject, kstToday, listOrders } from '@/lib/est/data'
import { lineTypCost } from '@/lib/est/settle'
import { execEstimateId, settlementNumbers } from '@/lib/est/exec'

const refresh = () => revalidatePath('/admin/est', 'layout')
const KINDS = ['자재', '용역', '장비', '노무', '경비']
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

async function access(projectId: number, min: 'writer' | 'reviewer' = 'writer') {
  const s = await requireEst(min)
  if (!atLeast(s.estRole, 'reviewer')) {
    const { rows } = await pool.query(
      `SELECT 1 FROM est_project p WHERE p.id = $1 AND (p.created_by = $2 OR EXISTS (SELECT 1 FROM est_project_member m WHERE m.project_id = p.id AND m.user_id = $2))`,
      [projectId, s.userId],
    )
    if (!rows[0]) throw new EstError('담당·작성한 견적 건만 고칠 수 있음')
  }
  const { rows } = await pool.query(`SELECT stage FROM est_project WHERE id = $1 AND deleted_at IS NULL`, [projectId])
  if (!rows[0]) throw new EstError('없는 견적 건임')
  if (rows[0].stage === 'CLOSED') throw new EstError('정산 마감된 건이라 고칠 수 없음')
  return s
}

// ---------- 수주·실행(S10) ----------

export async function startExec(projectId: number) {
  return act(async () => {
    await access(idOf(projectId))
    const { rowCount } = await pool.query(`UPDATE est_project SET stage = 'EXEC', updated_at = now() WHERE id = $1 AND stage = 'WON'`, [projectId])
    if (!rowCount) throw new EstError('수주된 건만 실행을 시작할 수 있음')
    refresh()
  })
}

/** 견적 줄에서 발주 끌어오기. 계획금액 = 예상원가 typ */
export async function ordersFromLines(projectId: number, lineIds: number[]) {
  return act<{ added: number }>(async () => {
    const s = await access(idOf(projectId))
    const estimateId = await execEstimateId(projectId)
    if (!estimateId) throw new EstError('실행 기준 판이 없음')
    const d = await getEstimateDetail(estimateId)
    if (!d) throw new EstError('없는 판임')
    const want = new Set(lineIds.map(Number))
    const lines = d.sections.flatMap((x) => x.lines).filter((l) => want.has(l.id) && !l.removed && l.grade !== 'manager')
    const existing = new Set((await listOrders(projectId)).map((o) => o.lineId))
    // 원가 열을 못 보는 역할에게는 계획금액(예상원가)을 발주금액 기본값으로 채워 보여 주지 않음
    const seeCost = canSeeCost(s.estRole, await getSettings())
    let added = 0
    for (const l of lines) {
      if (existing.has(l.id)) continue
      await pool.query(
        `INSERT INTO est_order (project_id, estimate_id, line_id, item_code, kind, name, qty, planned_amount, ordered_amount, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [projectId, estimateId, l.id, l.itemCode, l.kind, l.name, l.qty, lineTypCost(l), seeCost ? lineTypCost(l) : 0, s.userId],
      )
      added++
    }
    refresh()
    return { added }
  })
}

export async function addOrder(projectId: number, input: { kind: string; name: string; itemCode?: string; qty: number; plannedAmount: number; orderedAmount: number; vendor: string }) {
  return act(async () => {
    const s = await access(idOf(projectId))
    const name = str(input.name, 200)
    if (!name) throw new EstError('발주 이름을 입력해야 함')
    const kind = KINDS.includes(input.kind) ? input.kind : '자재'
    await pool.query(
      `INSERT INTO est_order (project_id, estimate_id, item_code, kind, name, vendor, qty, planned_amount, ordered_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [projectId, await execEstimateId(projectId), str(input.itemCode, 60) || null, kind, name, str(input.vendor, 200) || null, Math.max(0, num(input.qty)) || 1, int(input.plannedAmount), int(input.orderedAmount), s.userId],
    )
    refresh()
  })
}

export async function updateOrder(orderId: number, input: { vendor?: string; qty?: number; orderedAmount?: number; plannedAmount?: number; negotiationNote?: string; status?: string; orderedOn?: string }) {
  return act(async () => {
    const { rows } = await pool.query(`SELECT project_id FROM est_order WHERE id = $1`, [idOf(orderId)])
    if (!rows[0]) throw new EstError('없는 발주임')
    await access(n(rows[0].project_id))
    const status = input.status && ['draft', 'ordered', 'done', 'canceled'].includes(input.status) ? input.status : null
    await pool.query(
      `UPDATE est_order SET vendor = COALESCE($2, vendor), qty = COALESCE($3, qty), ordered_amount = COALESCE($4, ordered_amount),
         planned_amount = COALESCE($5, planned_amount), negotiation_note = COALESCE($6, negotiation_note), status = COALESCE($7, status),
         ordered_on = COALESCE($8::date, ordered_on, CASE WHEN $7 IN ('ordered','done') THEN (now() AT TIME ZONE 'Asia/Seoul')::date END), updated_at = now()
       WHERE id = $1`,
      [
        orderId,
        input.vendor !== undefined ? str(input.vendor, 200) : null,
        input.qty !== undefined ? Math.max(0, num(input.qty)) : null,
        input.orderedAmount !== undefined ? int(input.orderedAmount) : null,
        input.plannedAmount !== undefined ? int(input.plannedAmount) : null,
        input.negotiationNote !== undefined ? str(input.negotiationNote, 1000) : null,
        status,
        isDate(input.orderedOn) ? input.orderedOn : null,
      ],
    )
    refresh()
  })
}

export async function deleteOrder(orderId: number) {
  return act(async () => {
    const { rows } = await pool.query(`SELECT project_id FROM est_order WHERE id = $1`, [idOf(orderId)])
    if (!rows[0]) throw new EstError('없는 발주임')
    await access(n(rows[0].project_id))
    await pool.query(`DELETE FROM est_order WHERE id = $1`, [orderId])
    refresh()
  })
}

export async function addCrewDay(projectId: number, input: { workDate: string; itemCode: string; laborClass: string; headcount: number; hours: number; overtimeHours: number; night: boolean; note: string }) {
  return act(async () => {
    const s = await access(idOf(projectId))
    if (!isDate(input.workDate)) throw new EstError('날짜를 골라야 함')
    const head = num(input.headcount)
    if (!(head > 0)) throw new EstError('인원을 입력해야 함')
    const cls = ['our_staff', 'daily', 'partner'].includes(input.laborClass) ? input.laborClass : 'daily'
    await pool.query(
      `INSERT INTO est_crew_day (project_id, work_date, item_code, labor_class, headcount, hours, overtime_hours, night, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [projectId, input.workDate, str(input.itemCode, 60) || null, cls, head, num(input.hours) || 8, Math.max(0, num(input.overtimeHours)), Boolean(input.night), str(input.note, 500) || null, s.userId],
    )
    refresh()
  })
}

export async function deleteCrewDay(id: number) {
  return act(async () => {
    const { rows } = await pool.query(`SELECT project_id FROM est_crew_day WHERE id = $1`, [idOf(id)])
    if (!rows[0]) throw new EstError('없는 기록임')
    await access(n(rows[0].project_id))
    await pool.query(`DELETE FROM est_crew_day WHERE id = $1`, [id])
    refresh()
  })
}

// ---------- 정산(S11) — reviewer 이상 ----------

export async function addReceipt(projectId: number, input: { kind: string; amount: number; receivedOn: string; note: string }) {
  return act(async () => {
    const s = await access(idOf(projectId), 'reviewer')
    const amount = int(input.amount)
    if (!(amount > 0)) throw new EstError('금액을 입력해야 함')
    const kind = ['advance', 'interim', 'balance', 'extra', 'refund'].includes(input.kind) ? input.kind : 'balance'
    await pool.query(`INSERT INTO est_receipt (project_id, kind, amount, received_on, note, created_by) VALUES ($1,$2,$3,$4,$5,$6)`, [
      projectId, kind, amount, isDate(input.receivedOn) ? input.receivedOn : kstToday(), str(input.note, 500) || null, s.userId,
    ])
    refresh()
  })
}

export async function deleteReceipt(id: number) {
  return act(async () => {
    const { rows } = await pool.query(`SELECT project_id FROM est_receipt WHERE id = $1`, [idOf(id)])
    if (!rows[0]) throw new EstError('없는 수금임')
    await access(n(rows[0].project_id), 'reviewer')
    await pool.query(`DELETE FROM est_receipt WHERE id = $1`, [id])
    refresh()
  })
}

export async function addPayment(projectId: number, input: { kind: string; amount: number; paidOn: string; vendor: string; orderId?: number | null; itemCode?: string; evidence: string; note: string }) {
  return act(async () => {
    const s = await access(idOf(projectId), 'reviewer')
    const amount = int(input.amount)
    if (!(amount > 0)) throw new EstError('금액을 입력해야 함')
    const kind = [...KINDS, '담당자', '인센티브'].includes(input.kind) ? input.kind : '자재'
    let itemCode = str(input.itemCode, 60) || null
    if (input.orderId) {
      const o = await pool.query(`SELECT item_code FROM est_order WHERE id = $1 AND project_id = $2`, [idOf(input.orderId), projectId])
      if (!o.rows[0]) throw new EstError('그 건의 발주가 아님')
      itemCode = itemCode ?? o.rows[0].item_code
    }
    await pool.query(
      `INSERT INTO est_payment (project_id, order_id, item_code, kind, amount, paid_on, vendor, evidence_path, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [projectId, input.orderId || null, itemCode, kind, amount, isDate(input.paidOn) ? input.paidOn : kstToday(), str(input.vendor, 200) || null, str(input.evidence, 300) || null, str(input.note, 500) || null, s.userId],
    )
    refresh()
  })
}

export async function deletePayment(id: number) {
  return act(async () => {
    const { rows } = await pool.query(`SELECT project_id FROM est_payment WHERE id = $1`, [idOf(id)])
    if (!rows[0]) throw new EstError('없는 지출임')
    await access(n(rows[0].project_id), 'reviewer')
    await pool.query(`DELETE FROM est_payment WHERE id = $1`, [id])
    refresh()
  })
}

/** 담당자 실제 일수(기본 = 방문 기록 합계). null 이면 자동으로 되돌림 */
export async function setManagerDays(projectId: number, days: number | null, note?: string) {
  return act(async () => {
    await access(idOf(projectId), 'reviewer')
    await pool.query(
      `INSERT INTO est_settlement (project_id, manager_days, manager_days_overridden, note) VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id) DO UPDATE SET manager_days = EXCLUDED.manager_days, manager_days_overridden = EXCLUDED.manager_days_overridden,
         note = COALESCE(EXCLUDED.note, est_settlement.note), updated_at = now()`,
      [projectId, days === null ? 0 : Math.max(0, num(days)), days !== null, note !== undefined ? str(note, 2000) : null],
    )
    refresh()
  })
}

const OBS_SOURCE: Record<string, string> = { 자재: 'purchase', 장비: 'rental', 용역: 'subcontract_contract', 노무: 'labor', 경비: 'expense' }

/** 정산 마감: 숫자 확정, 단가 차이 후보 만들기, 완료 발주를 실단가 관측으로 쌓기, 단계 CLOSED */
export async function closeSettlement(projectId: number, note: string) {
  return act(async () => {
    const s = await access(idOf(projectId), 'reviewer')
    const p = await getProject(projectId)
    if (!p || p.stage !== 'SETTLE') throw new EstError('정산 단계인 건만 마감할 수 있음')
    const x = await settlementNumbers(projectId)
    await tx(async (c) => {
      await c.query(
        `INSERT INTO est_settlement (project_id, estimate_id, status, final_supply, received_total, paid_total, manager_days, manager_days_overridden, manager_cost,
           incentive_basis, incentive_amount, exec_profit, negotiation_gain, final_profit, closed_by, closed_at, note, updated_at)
         VALUES ($1,$2,'closed',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),$15,now())
         ON CONFLICT (project_id) DO UPDATE SET estimate_id = EXCLUDED.estimate_id, status = 'closed', final_supply = EXCLUDED.final_supply,
           received_total = EXCLUDED.received_total, paid_total = EXCLUDED.paid_total, manager_days = EXCLUDED.manager_days,
           manager_days_overridden = EXCLUDED.manager_days_overridden, manager_cost = EXCLUDED.manager_cost, incentive_basis = EXCLUDED.incentive_basis,
           incentive_amount = EXCLUDED.incentive_amount, exec_profit = EXCLUDED.exec_profit, negotiation_gain = EXCLUDED.negotiation_gain,
           final_profit = EXCLUDED.final_profit, closed_by = EXCLUDED.closed_by, closed_at = now(), note = EXCLUDED.note, updated_at = now()`,
        [
          projectId, x.estimateId, x.supply, x.settle.receivedTotal, x.settle.paidTotal, x.managerDays, x.overridden, x.settle.managerCost,
          JSON.stringify({ rate: x.managerRate, supply: x.supply }), x.settle.incentiveAmount, x.exec.profit, x.exec.negotiationGain, x.settle.finalProfit, s.userId, str(note, 2000) || null,
        ],
      )
      for (const v of x.variance.filter((v) => v.flagged)) {
        await c.query(
          `INSERT INTO est_variance_flag (project_id, item_code, estimate_price, actual_price, variance_pct)
           SELECT $1, $2, $3, $4, $5 WHERE NOT EXISTS (SELECT 1 FROM est_variance_flag WHERE project_id = $1 AND item_code = $2)`,
          [projectId, v.itemCode, v.estimatePrice, v.actualPrice, v.variancePct],
        )
      }
      for (const o of x.orders) {
        if (o.status !== 'done' || !o.itemCode || !(o.qty > 0)) continue
        await c.query(
          `INSERT INTO est_actual_cost (item_code, source, unit_price, vendor, project_id, observed_on, note, created_by)
           SELECT $1, $2, $3, $4, $5, COALESCE($6::date, (now() AT TIME ZONE 'Asia/Seoul')::date), $7, $8
           WHERE EXISTS (SELECT 1 FROM est_item WHERE code = $1)
             AND NOT EXISTS (SELECT 1 FROM est_actual_cost WHERE project_id = $5 AND item_code = $1 AND note = $7)`,
          [o.itemCode, OBS_SOURCE[o.kind] ?? 'manual', Math.round(o.orderedAmount / o.qty), o.vendor, projectId, o.orderedOn, `정산 마감 발주 #${o.id}`, s.userId],
        )
      }
      await c.query(`UPDATE est_project SET stage = 'CLOSED', updated_at = now() WHERE id = $1`, [projectId])
    })
    refresh()
  })
}
