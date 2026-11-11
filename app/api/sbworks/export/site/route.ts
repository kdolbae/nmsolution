import type { QueryResultRow } from 'pg'
import { pool } from '@/lib/db'
import { getContent } from '@/lib/content/get'
import { CONTENT_DEFAULTS, type ContentKey } from '@/lib/content/defaults'
import { ensureQuotePhotos } from '@/lib/quote-photos'
import { checkKey, json, SOURCE_NAME } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * N-CMS(sbworks.bond) 이관용 홈페이지 내용·시공사례·견적 문의 내보내기 (엔엠 어드민 삭제 계획, kevin 2026-11-10).
 * N-CMS 설계 문서: sb_app01 manage/uffice/31_홈페이지_내용_N-CMS.md
 *  - pages:  메인·사업소개·회사소개·사이트 설정. 저장 값 위에 기본값을 합친 완성본(홈페이지에 지금 보이는 그대로). savedKeys 는 실제로 저장된 키
 *  - cases:  시공사례(projects) 전부 — 비공개 포함
 *  - quotes: 견적 문의(quote_requests) 전부, photos 는 사진 정보만(원본은 /api/sbworks/export/quote-photos/<id>)
 * 읽기만 하고 아무것도 지우거나 바꾸지 않는다. 인증: Authorization: Bearer <SBWORKS_API_KEY>.
 */
async function rows<T extends QueryResultRow = QueryResultRow>(sql: string): Promise<T[]> {
  const table = /FROM\s+([a-z_]+)/i.exec(sql)?.[1]
  if (table) {
    const { rows: r } = await pool.query<{ ok: string | null }>(`SELECT to_regclass($1) AS ok`, [table])
    if (!r[0]?.ok) return []
  }
  return (await pool.query<T>(sql)).rows
}

export async function GET(req: Request) {
  const denied = checkKey(req)
  if (denied) return denied
  await ensureQuotePhotos().catch(() => null)
  const keys = Object.keys(CONTENT_DEFAULTS) as ContentKey[]
  const [pageList, saved, cases, quotes, photos] = await Promise.all([
    Promise.all(keys.map(async (k) => [k, await getContent(k)] as const)),
    rows<{ key: string; updated_at: string }>(`SELECT key, updated_at FROM site_content ORDER BY key`),
    rows(`SELECT * FROM projects ORDER BY sort_order, id`),
    rows(`SELECT * FROM quote_requests ORDER BY id`),
    rows(`SELECT id, quote_id, mime, bytes, created_at FROM quote_photos ORDER BY quote_id, id`),
  ])
  return json({
    source: SOURCE_NAME,
    at: new Date().toISOString(),
    pages: Object.fromEntries(pageList),
    savedKeys: saved,
    cases,
    quotes,
    photos,
  })
}
