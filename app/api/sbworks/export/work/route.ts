import type { QueryResultRow } from 'pg'
import { pool } from '@/lib/db'
import { checkKey, json, SOURCE_NAME } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * N-CMS(sbworks.bond) 이관용 업체 관리 나머지 내보내기 (kevin 2026-11-11 "마케팅 제외하고 모든 기능 가져와").
 *  - workOrders:       업무 지시서(client_work_orders) 전부, 본문·현장 팀 링크 키 포함
 *  - materials:        자재 리스트(client_materials) 업체(견적 행)마다 한 벌
 *  - takeoffTemplates: 어드민에서 저장한 적산 템플릿(site_content 'takeoff_templates'). 기본 템플릿은 N-CMS 코드에 같이 있다
 * 읽기만 한다. 표가 아직 없으면 빈 목록. 인증: Authorization: Bearer <SBWORKS_API_KEY>.
 */
async function rows<T extends QueryResultRow = QueryResultRow>(table: string, sql: string): Promise<T[]> {
  const { rows: r } = await pool.query<{ ok: string | null }>(`SELECT to_regclass($1) AS ok`, [table])
  if (!r[0]?.ok) return []
  return (await pool.query<T>(sql)).rows
}

export async function GET(req: Request) {
  const denied = checkKey(req)
  if (denied) return denied
  const [workOrders, materials, templates] = await Promise.all([
    rows('client_work_orders', `SELECT id, client_id, no, number, title, status, markdown, note, share_key, model, created_by, created_at, updated_at FROM client_work_orders ORDER BY client_id, no`),
    rows('client_materials', `SELECT client_id, items, updated_at, updated_by FROM client_materials ORDER BY client_id`),
    rows<{ data: { items?: unknown[] } | null; updated_at: string }>('site_content', `SELECT data, updated_at FROM site_content WHERE key = 'takeoff_templates'`),
  ])
  const items = templates[0]?.data?.items
  return json({
    source: SOURCE_NAME,
    at: new Date().toISOString(),
    workOrders,
    materials,
    takeoffTemplates: Array.isArray(items) ? items : [],
  })
}
