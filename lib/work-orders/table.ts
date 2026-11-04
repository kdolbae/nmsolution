import { randomBytes } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureClients } from '@/lib/clients/table'
import { markdownTitle } from './markdown'

/**
 * 업무 지시서 (전 업체 공통, kevin 2026-11-03).
 * 견적서 행(업체·추가 견적서) 하나를 프로젝트로 보고, 그 안에서 현장 자료(견적 품목·제안서·공정표·메모)를 근거로
 * Claude 가 초안을 만들고(lib/work-orders/generate.ts) 관리자가 Markdown 으로 고쳐 확정한다.
 * - 번호: 견적번호-W순번 (NM-2610-07-W1). 다시 만들면 순번이 올라간다(버전처럼 남김).
 * - 현장 팀 링크 /work/<키>: 비밀번호 없이 열리는 긴 무작위 키. 열람·PDF 는 접속 기록(work_order_view·work_order_pdf)에 남는다.
 * - 금액·원가·공급처 단가는 넣지 않는다(현장 인력용). 표는 첫 조회 때 생긴다.
 */

export type WorkOrderStatus = 'draft' | 'issued'

export type WorkOrderMeta = {
  no: number
  number: string
  title: string
  status: WorkOrderStatus
  shareKey: string
  model: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type WorkOrder = WorkOrderMeta & { markdown: string; note: string }

let ready: Promise<void> | null = null

export function ensureWorkOrders(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS client_work_orders (
        id          bigint generated always as identity primary key,
        client_id   bigint not null references clients(id) on delete cascade,
        no          int not null,
        number      text not null,
        title       text not null default '',
        status      text not null default 'draft',
        markdown    text not null default '',
        note        text not null default '',
        share_key   text not null unique,
        model       text,
        created_by  text,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now(),
        unique (client_id, no)
      )`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Db = {
  no: number
  number: string
  title: string
  status: string
  share_key: string
  model: string | null
  created_by: string | null
  created_at: Date
  updated_at: Date
  markdown?: string
  note?: string
}

const META = `no, number, title, status, share_key, model, created_by, created_at, updated_at`

const toMeta = (r: Db): WorkOrderMeta => ({
  no: r.no,
  number: r.number,
  title: r.title,
  status: r.status === 'issued' ? 'issued' : 'draft',
  shareKey: r.share_key,
  model: r.model ?? '',
  createdBy: r.created_by ?? '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const toFull = (r: Db): WorkOrder => ({ ...toMeta(r), markdown: r.markdown ?? '', note: r.note ?? '' })

export async function listWorkOrders(clientId: number): Promise<WorkOrderMeta[]> {
  await ensureWorkOrders()
  const { rows } = await pool.query<Db>(`SELECT ${META} FROM client_work_orders WHERE client_id = $1 ORDER BY no DESC`, [clientId])
  return rows.map(toMeta)
}

export async function getWorkOrder(clientId: number, no: number): Promise<WorkOrder | null> {
  if (!Number.isSafeInteger(clientId) || !Number.isSafeInteger(no)) return null
  await ensureWorkOrders()
  const { rows } = await pool.query<Db>(`SELECT ${META}, markdown, note FROM client_work_orders WHERE client_id = $1 AND no = $2`, [clientId, no])
  return rows[0] ? toFull(rows[0]) : null
}

/** 현장 팀 링크용: 키로 찾는다. 발행(issued)한 것만 열린다 */
export async function getWorkOrderByKey(key: string): Promise<(WorkOrder & { clientId: number }) | null> {
  if (!/^[a-z0-9]{20,64}$/.test(key)) return null
  await ensureWorkOrders()
  const { rows } = await pool.query<Db & { client_id: string }>(
    `SELECT client_id, ${META}, markdown, note FROM client_work_orders WHERE share_key = $1 AND status = 'issued'`,
    [key],
  )
  return rows[0] ? { ...toFull(rows[0]), clientId: Number(rows[0].client_id) } : null
}

const newKey = () => randomBytes(16).toString('hex')

/** 새 지시서 한 벌 저장(초안). quoteNumber 로 번호를 만든다 */
export async function createWorkOrder(
  clientId: number,
  by: string,
  input: { quoteNumber: string; markdown: string; title?: string; note?: string; model?: string },
): Promise<WorkOrderMeta> {
  await ensureWorkOrders()
  const title = (input.title ?? markdownTitle(input.markdown) ?? '').trim().slice(0, 200) || '업무 지시서'
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { rows } = await pool.query<Db>(
        `INSERT INTO client_work_orders (client_id, no, number, title, markdown, note, share_key, model, created_by)
         VALUES ($1, COALESCE((SELECT MAX(no) FROM client_work_orders WHERE client_id = $1), 0) + 1,
                 $2 || '-W' || (COALESCE((SELECT MAX(no) FROM client_work_orders WHERE client_id = $1), 0) + 1),
                 $3, $4, $5, $6, $7, $8)
         RETURNING ${META}`,
        [clientId, input.quoteNumber || 'WO', title, input.markdown, (input.note ?? '').slice(0, 4000), newKey(), input.model ?? null, by],
      )
      return toMeta(rows[0])
    } catch (e) {
      // 같은 순번·키 충돌이면 다시 시도
      if (attempt === 2) throw e
    }
  }
  throw new Error('업무 지시서를 저장하지 못했습니다.')
}

export async function updateWorkOrder(clientId: number, no: number, input: { markdown: string; title?: string }) {
  await ensureWorkOrders()
  const title = (input.title ?? markdownTitle(input.markdown)).trim().slice(0, 200) || '업무 지시서'
  const { rowCount } = await pool.query(
    `UPDATE client_work_orders SET markdown = $3, title = $4, updated_at = now() WHERE client_id = $1 AND no = $2`,
    [clientId, no, input.markdown, title],
  )
  if (!rowCount) throw new Error('없는 업무 지시서입니다.')
}

/** 발행: 현장 팀 링크가 열린다. 초안으로 되돌리면 링크가 닫힌다 */
export async function setWorkOrderStatus(clientId: number, no: number, status: WorkOrderStatus) {
  await ensureWorkOrders()
  await pool.query(`UPDATE client_work_orders SET status = $3, updated_at = now() WHERE client_id = $1 AND no = $2`, [clientId, no, status])
}

export async function deleteWorkOrder(clientId: number, no: number) {
  await ensureWorkOrders()
  await pool.query(`DELETE FROM client_work_orders WHERE client_id = $1 AND no = $2`, [clientId, no])
}
