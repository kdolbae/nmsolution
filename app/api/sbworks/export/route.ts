import type { QueryResultRow } from 'pg'
import { pool } from '@/lib/db'
import { ensureClients } from '@/lib/clients/table'
import { checkKey, json, SOURCE_NAME } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * N-CMS(sbworks.bond) 데이터 이관용 전체 내보내기 (기획서 10장 1차-a 9번).
 * 업체·견적·버전·발송·공정·열람 기록·명함·발주서를 표 그대로(jsonb 포함) 돌려준다. 읽기만 하고 아무것도 지우지 않는다.
 * 명함 사진은 크기 때문에 빼고(has_image·mime 만), /api/sbworks/export/cards/<id> 로 따로 받는다.
 * 인증: Authorization: Bearer <SBWORKS_API_KEY>. ?since=ISO시각 이면 그 뒤에 바뀐 업체(updated_at)만 — 버전·발송·공정·기록은 그 업체 것만.
 */
async function rows<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const table = /FROM\s+([a-z_]+)/i.exec(sql)?.[1]
  if (table) {
    const { rows: r } = await pool.query<{ ok: string | null }>(`SELECT to_regclass($1) AS ok`, [table])
    if (!r[0]?.ok) return []
  }
  return (await pool.query<T>(sql, params)).rows
}

export async function GET(req: Request) {
  const denied = checkKey(req)
  if (denied) return denied
  await ensureClients()
  const since = new URL(req.url).searchParams.get('since')
  const sinceAt = since ? new Date(since) : null
  if (sinceAt && Number.isNaN(sinceAt.getTime())) return json({ error: 'since 는 ISO 시각으로 보내야 함.' }, 400)

  const clients = await rows<{ id: string }>(sinceAt ? `SELECT * FROM clients WHERE updated_at > $1 ORDER BY id` : `SELECT * FROM clients ORDER BY id`, sinceAt ? [sinceAt] : [])
  const ids = clients.map((c) => Number(c.id))
  const byClient = (table: string, order = 'id') => (sinceAt ? rows(`SELECT * FROM ${table} WHERE client_id = ANY($1::bigint[]) ORDER BY ${order}`, [ids]) : rows(`SELECT * FROM ${table} ORDER BY ${order}`))

  const [versions, sends, schedules, scheduleLog, accessLog, cards, profiles, parties, orders] = await Promise.all([
    byClient('client_versions', 'client_id, version_no'),
    byClient('client_sends', 'client_id, send_no'),
    byClient('client_schedules', 'client_id'),
    byClient('client_schedule_log', 'client_id, revision'),
    sinceAt ? rows(`SELECT * FROM client_access_log WHERE client_id = ANY($1::bigint[]) ORDER BY id`, [ids]) : rows(`SELECT * FROM client_access_log ORDER BY id`),
    sinceAt
      ? rows(`SELECT id, client_id, status, error, card_text, mime, (image IS NOT NULL) AS has_image, contact, created_at, updated_at FROM client_cards WHERE client_id = ANY($1::bigint[]) ORDER BY id`, [ids])
      : rows(`SELECT id, client_id, status, error, card_text, mime, (image IS NOT NULL) AS has_image, contact, created_at, updated_at FROM client_cards ORDER BY id`),
    byClient('client_profiles', 'client_id'),
    rows(`SELECT * FROM po_parties ORDER BY kind, sort_order, id`),
    rows(`SELECT * FROM purchase_orders ORDER BY id`),
  ])
  return json({ source: SOURCE_NAME, at: new Date().toISOString(), since: sinceAt?.toISOString() ?? null, clients, versions, sends, schedules, scheduleLog, accessLog, cards, profiles, parties, orders })
}
