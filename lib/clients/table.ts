import { pool } from '@/lib/db'
import { normalizeQuote, type Quote } from './quote'
import { kktProposalHtml } from './proposal'
import { KKT_CLIENT, KKT_QUOTE, upgradeKkt } from './seed-kkt'

/**
 * 업체 관리(제안서·견적서) 표. sql/007_clients.sql 과 같은 모양.
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/site-events-table.ts 와 같은 방식).
 * 표를 처음 만들 때 금강변압기 제안서·견적서를 첫 업체로 넣는다.
 */
let ready: Promise<void> | null = null

export function ensureClients(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const { rows } = await pool.query(`SELECT to_regclass('clients') IS NOT NULL AS exists`)
      await pool.query(`CREATE TABLE IF NOT EXISTS clients (
        id             bigint generated always as identity primary key,
        name           text not null,
        contact_person text,
        phone          text,
        email          text,
        site_address   text,
        memo           text,
        proposal_html  text,
        quote          jsonb,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now()
      )`)
      if (!rows[0]?.exists) {
        const { PAGE_HTML } = await import('@/app/kkt/page-html')
        await pool.query(
          `INSERT INTO clients (name, site_address, proposal_html, quote)
           SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM clients)`,
          [KKT_CLIENT.name, KKT_CLIENT.siteAddress, kktProposalHtml(PAGE_HTML), JSON.stringify(KKT_QUOTE)],
        )
      }
      // 저장된 금강변압기 견적서에 옛 베이스 공종이 남아 있으면 고친다 (seed-kkt.ts upgradeKkt)
      const kkt = await pool.query<{ id: string; quote: unknown; proposal_html: string | null }>(
        `SELECT id, quote, proposal_html FROM clients WHERE name = $1`,
        [KKT_CLIENT.name],
      )
      for (const r of kkt.rows) {
        const up = upgradeKkt(normalizeQuote(r.quote), r.proposal_html ?? '')
        if (up) {
          await pool.query(`UPDATE clients SET quote = $2, proposal_html = $3, updated_at = now() WHERE id = $1`, [
            r.id,
            JSON.stringify(up.quote),
            up.proposalHtml,
          ])
        }
      }
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

export type ClientInfo = {
  name: string
  contactPerson: string
  phone: string
  email: string
  siteAddress: string
  memo: string
}

export type ClientRow = ClientInfo & {
  id: number
  proposalHtml: string
  quote: Quote
  createdAt: Date
  updatedAt: Date
}

type DbRow = {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  site_address: string | null
  memo: string | null
  proposal_html: string | null
  quote: unknown
  created_at: Date
  updated_at: Date
}

function toClient(r: DbRow): ClientRow {
  return {
    id: Number(r.id),
    name: r.name,
    contactPerson: r.contact_person ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    siteAddress: r.site_address ?? '',
    memo: r.memo ?? '',
    proposalHtml: r.proposal_html ?? '',
    quote: normalizeQuote(r.quote),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listClients(): Promise<ClientRow[]> {
  await ensureClients()
  const { rows } = await pool.query<DbRow>(`SELECT * FROM clients ORDER BY updated_at DESC`)
  return rows.map(toClient)
}

export async function getClient(id: number): Promise<ClientRow | null> {
  if (!Number.isSafeInteger(id)) return null
  await ensureClients()
  const { rows } = await pool.query<DbRow>(`SELECT * FROM clients WHERE id = $1`, [id])
  return rows[0] ? toClient(rows[0]) : null
}

export async function insertClient(info: ClientInfo, proposalHtml: string, quote: Quote): Promise<number> {
  await ensureClients()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO clients (name, contact_person, phone, email, site_address, memo, proposal_html, quote)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo, proposalHtml, JSON.stringify(quote)],
  )
  return Number(rows[0].id)
}

export async function updateClientInfo(id: number, info: ClientInfo) {
  await ensureClients()
  await pool.query(
    `UPDATE clients SET name = $2, contact_person = $3, phone = $4, email = $5, site_address = $6, memo = $7, updated_at = now()
     WHERE id = $1`,
    [id, info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo],
  )
}

export async function updateProposal(id: number, html: string) {
  await ensureClients()
  await pool.query(`UPDATE clients SET proposal_html = $2, updated_at = now() WHERE id = $1`, [id, html])
}

export async function updateQuote(id: number, quote: Quote) {
  await ensureClients()
  await pool.query(`UPDATE clients SET quote = $2, updated_at = now() WHERE id = $1`, [id, JSON.stringify(quote)])
}

export async function removeClient(id: number) {
  await ensureClients()
  await pool.query(`DELETE FROM clients WHERE id = $1`, [id])
}
