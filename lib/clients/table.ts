import type { PoolClient } from 'pg'
import { pool } from '@/lib/db'
import { calcQuote, normalizeQuote, type Quote } from './quote'
import { changedQuoteParts } from './compare'
import { kktProposalHtml } from './proposal'
import { KKT_CLIENT, KKT_QUOTE, upgradeKkt } from './seed-kkt'

/**
 * 업체 관리(제안서·견적서) 표. sql/007_clients.sql, sql/008_client_versions.sql 과 같은 모양.
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/site-events-table.ts 와 같은 방식).
 * 표를 처음 만들 때 금강변압기 제안서·견적서를 첫 업체로 넣는다.
 *
 * 버전: 제안서·견적서를 저장할 때마다 client_versions 에 그때의 제안서·견적서 전체를 한 벌 남긴다.
 * 최종본 확정(finalized_at)이 되면 제안서·견적서는 더 고칠 수 없다.
 */
let ready: Promise<void> | null = null

export const LOCKED_MESSAGE = '최종본으로 확정된 견적이라 제안서·견적서를 고칠 수 없습니다.'

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
      await pool.query(`ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS finalized_version int,
        ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
        ADD COLUMN IF NOT EXISTS finalized_by text`)
      await pool.query(`CREATE TABLE IF NOT EXISTS client_versions (
        id            bigint generated always as identity primary key,
        client_id     bigint not null references clients(id) on delete cascade,
        version_no    int not null,
        change        text not null,
        summary       text,
        proposal_html text,
        quote         jsonb,
        created_by    text,
        created_at    timestamptz not null default now(),
        unique (client_id, version_no)
      )`)
      if (!rows[0]?.exists) {
        const { PAGE_HTML } = await import('@/app/kkt/page-html')
        await pool.query(
          `INSERT INTO clients (name, site_address, proposal_html, quote)
           SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM clients)`,
          [KKT_CLIENT.name, KKT_CLIENT.siteAddress, kktProposalHtml(PAGE_HTML), JSON.stringify(KKT_QUOTE)],
        )
      }
      // 버전 기록이 없는 업체는 지금 상태를 v1 로 남긴다
      await pool.query(
        `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_at)
         SELECT c.id, 1, 'init', '기록 시작 시점의 저장본', c.proposal_html, c.quote, c.updated_at FROM clients c
         WHERE NOT EXISTS (SELECT 1 FROM client_versions v WHERE v.client_id = c.id)
         ON CONFLICT DO NOTHING`,
      )
      // 저장된 금강변압기 제안서·견적서를 최신 결정에 맞춘다 (seed-kkt.ts upgradeKkt). 확정된 업체는 건드리지 않는다
      const kkt = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND finalized_at IS NULL`, [KKT_CLIENT.name])
      if (kkt.rows.length) {
        const { PAGE_HTML } = await import('@/app/kkt/page-html')
        for (const r of kkt.rows) {
          await applyChange(Number(r.id), 'system', '자동 정리', (cur) => {
            const up = upgradeKkt(normalizeQuote(cur.quote), cur.proposalHtml, () => kktProposalHtml(PAGE_HTML))
            return up && { proposalHtml: up.proposalHtml, quote: up.quote, summary: up.summary }
          }).catch(() => null)
        }
      }
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Current = { proposalHtml: string; quote: unknown }
type Next = { proposalHtml?: string; quote?: Quote; summary: string }

/**
 * 제안서·견적서를 고치고 버전을 하나 남긴다. 확정된 업체면 LOCKED_MESSAGE 로 거절한다.
 * 저장한 내용이 바로 앞 버전과 같으면 버전을 늘리지 않는다. 남긴 버전 번호(없으면 null)를 돌려준다.
 */
async function applyChange(
  id: number,
  change: 'proposal' | 'quote' | 'system',
  by: string,
  mutate: (cur: Current) => Next | null,
): Promise<number | null> {
  const db: PoolClient = await pool.connect()
  try {
    await db.query('BEGIN')
    const { rows } = await db.query<{ proposal_html: string | null; quote: unknown; finalized_at: Date | null }>(
      `SELECT proposal_html, quote, finalized_at FROM clients WHERE id = $1 FOR UPDATE`,
      [id],
    )
    if (!rows[0]) throw new Error('업체를 찾을 수 없습니다.')
    if (rows[0].finalized_at) throw new Error(LOCKED_MESSAGE)
    const next = mutate({ proposalHtml: rows[0].proposal_html ?? '', quote: rows[0].quote })
    if (!next) {
      await db.query('ROLLBACK')
      return null
    }
    await db.query(
      `UPDATE clients SET proposal_html = COALESCE($2, proposal_html), quote = COALESCE($3::jsonb, quote), updated_at = now() WHERE id = $1`,
      [id, next.proposalHtml ?? null, next.quote ? JSON.stringify(next.quote) : null],
    )
    const ins = await db.query<{ version_no: number }>(
      `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
       SELECT c.id, COALESCE(l.version_no, 0) + 1, $2, $3, c.proposal_html, c.quote, $4
       FROM clients c
       LEFT JOIN LATERAL (SELECT * FROM client_versions v WHERE v.client_id = c.id ORDER BY version_no DESC LIMIT 1) l ON true
       WHERE c.id = $1
         AND (l.id IS NULL OR l.proposal_html IS DISTINCT FROM c.proposal_html OR l.quote IS DISTINCT FROM c.quote)
       RETURNING version_no`,
      [id, change, next.summary, by],
    )
    await db.query('COMMIT')
    return ins.rows[0]?.version_no ?? null
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    db.release()
  }
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
  /** 최종본으로 확정한 버전. 확정 전이면 null */
  finalized: { version: number; at: Date; by: string } | null
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
  finalized_version: number | null
  finalized_at: Date | null
  finalized_by: string | null
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
    finalized: r.finalized_at ? { version: r.finalized_version ?? 0, at: r.finalized_at, by: r.finalized_by ?? '' } : null,
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

export async function insertClient(info: ClientInfo, proposalHtml: string, quote: Quote, by: string): Promise<number> {
  await ensureClients()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO clients (name, contact_person, phone, email, site_address, memo, proposal_html, quote)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo, proposalHtml, JSON.stringify(quote)],
  )
  const id = Number(rows[0].id)
  await pool.query(
    `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
     VALUES ($1, 1, 'init', '업체 등록', $2, $3, $4) ON CONFLICT DO NOTHING`,
    [id, proposalHtml, JSON.stringify(quote), by],
  )
  return id
}

export async function updateClientInfo(id: number, info: ClientInfo) {
  await ensureClients()
  await pool.query(
    `UPDATE clients SET name = $2, contact_person = $3, phone = $4, email = $5, site_address = $6, memo = $7, updated_at = now()
     WHERE id = $1`,
    [id, info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo],
  )
}

export async function updateProposal(id: number, html: string, by: string, summary = '제안서 수정') {
  await ensureClients()
  return applyChange(id, 'proposal', by, (cur) => (cur.proposalHtml === html ? null : { proposalHtml: html, summary }))
}

export async function updateQuote(id: number, quote: Quote, by: string) {
  await ensureClients()
  return applyChange(id, 'quote', by, (cur) => {
    const parts = changedQuoteParts(normalizeQuote(cur.quote), quote)
    return { quote, summary: parts.length ? `견적서 수정: ${parts.join(', ')}` : '견적서 저장' }
  })
}

export type VersionMeta = {
  no: number
  change: 'init' | 'proposal' | 'quote' | 'system'
  summary: string
  by: string
  at: Date
  /** 그 버전 견적서의 공급가액 */
  supply: number
}

export type Version = VersionMeta & { proposalHtml: string; quote: Quote }

/** 버전 목록 (최신이 먼저). 제안서 HTML 은 크므로 싣지 않는다 */
export async function listVersions(clientId: number): Promise<VersionMeta[]> {
  await ensureClients()
  const { rows } = await pool.query<{ version_no: number; change: VersionMeta['change']; summary: string | null; created_by: string | null; created_at: Date; quote: unknown }>(
    `SELECT version_no, change, summary, created_by, created_at, quote FROM client_versions WHERE client_id = $1 ORDER BY version_no DESC`,
    [clientId],
  )
  return rows.map((r) => ({
    no: r.version_no,
    change: r.change,
    summary: r.summary ?? '',
    by: r.created_by ?? '',
    at: r.created_at,
    supply: calcQuote(normalizeQuote(r.quote)).supply,
  }))
}

export async function getVersion(clientId: number, no: number): Promise<Version | null> {
  if (!Number.isSafeInteger(clientId) || !Number.isSafeInteger(no)) return null
  await ensureClients()
  const { rows } = await pool.query<{ version_no: number; change: VersionMeta['change']; summary: string | null; created_by: string | null; created_at: Date; quote: unknown; proposal_html: string | null }>(
    `SELECT * FROM client_versions WHERE client_id = $1 AND version_no = $2`,
    [clientId, no],
  )
  const r = rows[0]
  if (!r) return null
  const quote = normalizeQuote(r.quote)
  return {
    no: r.version_no,
    change: r.change,
    summary: r.summary ?? '',
    by: r.created_by ?? '',
    at: r.created_at,
    supply: calcQuote(quote).supply,
    proposalHtml: r.proposal_html ?? '',
    quote,
  }
}

/** 지금 최신 버전을 최종본으로 확정한다. 확정 후에는 제안서·견적서를 고칠 수 없다 */
export async function finalizeClient(id: number, by: string): Promise<number> {
  await ensureClients()
  const { rows } = await pool.query<{ finalized_version: number }>(
    `UPDATE clients c SET finalized_at = now(), finalized_by = $2,
       finalized_version = (SELECT MAX(version_no) FROM client_versions v WHERE v.client_id = c.id)
     WHERE c.id = $1 AND c.finalized_at IS NULL
     RETURNING finalized_version`,
    [id, by],
  )
  if (!rows[0]) throw new Error('이미 확정했거나 없는 업체입니다.')
  return rows[0].finalized_version
}

export async function removeClient(id: number) {
  await ensureClients()
  await pool.query(`DELETE FROM clients WHERE id = $1`, [id])
}
