import { pool } from '@/lib/db'
import { emptyParty, normalizeOrder, normalizeParty, todayKst, type PoParty, type PoPartyRow, type PurchaseOrder } from './doc'

/**
 * 발주서 표. 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/clients/table.ts 와 같은 방식).
 * - po_parties: 발주 사업자(issuer)·발주처(supplier) 기본값. 발주서를 만들 때 골라 복사한다.
 * - purchase_orders: 발주서. 사업자 정보는 발주서 안에 복사해 두므로 나중에 기본값을 고쳐도 지난 발주서는 그대로다.
 * 사업자번호·주소 같은 값은 어드민에서 넣는다(공개 저장소라 코드에 두지 않음).
 */
let ready: Promise<void> | null = null

const SEED_PARTIES: { kind: 'issuer' | 'supplier'; party: PoParty }[] = [
  { kind: 'issuer', party: { ...emptyParty('엔엠솔루션'), ceo: '김성배', address: '경기도 평택시 고덕동 도시지원로 121 지식공장아이타워 906호', phone: '1800-5901' } },
  { kind: 'issuer', party: { ...emptyParty('프레치제'), ceo: '김성배' } },
  { kind: 'supplier', party: { ...emptyParty('(주)새롬판넬 화성공장') } },
]

export function ensureOrders(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS po_parties (
        id         bigint generated always as identity primary key,
        kind       text not null,
        data       jsonb not null default '{}'::jsonb,
        sort_order int not null default 0,
        created_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS purchase_orders (
        id         bigint generated always as identity primary key,
        no         text,
        data       jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS po_seeds (key text primary key, created_at timestamptz not null default now())`)
      const { rowCount } = await pool.query(`INSERT INTO po_seeds (key) VALUES ('parties-v1') ON CONFLICT DO NOTHING`)
      if (rowCount) {
        let i = 0
        for (const s of SEED_PARTIES)
          await pool.query(`INSERT INTO po_parties (kind, data, sort_order) VALUES ($1, $2, $3)`, [s.kind, JSON.stringify(s.party), i++])
      }
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type PartyDbRow = { id: string; kind: string; data: unknown; sort_order: number }
const toParty = (r: PartyDbRow): PoPartyRow => ({
  ...normalizeParty(r.data),
  id: Number(r.id),
  kind: r.kind === 'supplier' ? 'supplier' : 'issuer',
  sortOrder: r.sort_order,
})

export async function listParties(): Promise<PoPartyRow[]> {
  await ensureOrders()
  const { rows } = await pool.query<PartyDbRow>(`SELECT id, kind, data, sort_order FROM po_parties ORDER BY kind, sort_order, id`)
  return rows.map(toParty)
}

export async function saveParty(id: number | null, kind: 'issuer' | 'supplier', party: PoParty): Promise<number> {
  await ensureOrders()
  const data = JSON.stringify(normalizeParty(party))
  if (id) {
    await pool.query(`UPDATE po_parties SET data = $2 WHERE id = $1`, [id, data])
    return id
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO po_parties (kind, data, sort_order) VALUES ($1, $2, (SELECT coalesce(max(sort_order), 0) + 1 FROM po_parties)) RETURNING id`,
    [kind, data],
  )
  return Number(rows[0].id)
}

export async function deleteParty(id: number) {
  await ensureOrders()
  await pool.query(`DELETE FROM po_parties WHERE id = $1`, [id])
}

export type OrderRow = { id: number; order: PurchaseOrder; createdAt: Date; updatedAt: Date }
type OrderDbRow = { id: string; data: unknown; created_at: Date; updated_at: Date }
const toOrder = (r: OrderDbRow): OrderRow => ({ id: Number(r.id), order: normalizeOrder(r.data), createdAt: r.created_at, updatedAt: r.updated_at })

export async function listOrders(): Promise<OrderRow[]> {
  await ensureOrders()
  const { rows } = await pool.query<OrderDbRow>(`SELECT id, data, created_at, updated_at FROM purchase_orders ORDER BY id DESC LIMIT 500`)
  return rows.map(toOrder)
}

export async function getOrder(id: number): Promise<OrderRow | null> {
  if (!Number.isFinite(id)) return null
  await ensureOrders()
  const { rows } = await pool.query<OrderDbRow>(`SELECT id, data, created_at, updated_at FROM purchase_orders WHERE id = $1`, [id])
  return rows[0] ? toOrder(rows[0]) : null
}

/** 발주번호 PO-YYMM-순번 (발주일자 기준 달) */
async function nextNo(date: string): Promise<string> {
  const d = /^\d{4}-\d{2}/.test(date) ? date : todayKst()
  const prefix = `PO-${d.slice(2, 4)}${d.slice(5, 7)}-`
  const { rows } = await pool.query<{ no: string }>(`SELECT no FROM purchase_orders WHERE no LIKE $1`, [prefix + '%'])
  const max = rows.reduce((m, r) => Math.max(m, Number(r.no.slice(prefix.length)) || 0), 0)
  return prefix + String(max + 1).padStart(2, '0')
}

export async function insertOrder(order: PurchaseOrder): Promise<number> {
  await ensureOrders()
  const o = normalizeOrder(order)
  o.no = o.no || (await nextNo(o.date))
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO purchase_orders (no, data) VALUES ($1, $2) RETURNING id`, [o.no, JSON.stringify(o)])
  return Number(rows[0].id)
}

export async function updateOrder(id: number, order: PurchaseOrder): Promise<PurchaseOrder> {
  await ensureOrders()
  const o = normalizeOrder(order)
  if (!o.no) o.no = await nextNo(o.date)
  await pool.query(`UPDATE purchase_orders SET no = $2, data = $3, updated_at = now() WHERE id = $1`, [id, o.no, JSON.stringify(o)])
  return o
}

export async function removeOrder(id: number) {
  await ensureOrders()
  await pool.query(`DELETE FROM purchase_orders WHERE id = $1`, [id])
}
