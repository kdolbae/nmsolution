import { pool } from '@/lib/db'
import { ensureQuoteRequests } from '@/lib/quote-table'
import { ensureQuotePhotos } from '@/lib/quote-photos'
import { checkKey, json, SOURCE_NAME } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  name: string
  phone: string
  company: string
  location: string
  categories: string
  message: string
  status: string
  memo: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
  click_id: string
  landing_path: string
  referrer: string
  first_seen_at: Date | null
  created_at: Date
  updated_at: Date
}

/**
 * 홈페이지 견적 문의 원문(이름·연락처·광고 유입·현장 사진 목록). SBworks 가 상담관리(문의)로 가져간다.
 * 상황판 사본(board-sync)은 건수·번호 해시만 보내므로, 이름·연락처가 SBworks 에 쌓이는 길은 이것뿐이다(kevin 2026-10-27 홍보 자료 빠짐없이).
 * ?since=ISO시각 을 주면 그 뒤에 들어오거나 바뀐 문의만. 사진 파일은 /api/sbworks/inquiries/photos/<id>.
 */
export async function GET(req: Request) {
  const denied = checkKey(req)
  if (denied) return denied
  const since = new URL(req.url).searchParams.get('since')
  const sinceAt = since ? new Date(since) : null
  if (sinceAt && Number.isNaN(sinceAt.getTime())) return json({ error: 'since 는 ISO 시각으로 보내야 함.' }, 400)

  await Promise.all([ensureQuoteRequests(), ensureQuotePhotos()])
  const { rows } = await pool.query<Row>(
    `SELECT * FROM quote_requests WHERE $1::timestamptz IS NULL OR updated_at > $1 OR created_at > $1 ORDER BY id`,
    [sinceAt],
  )
  const ids = rows.map((r) => r.id)
  const photos = ids.length
    ? (
        await pool.query<{ id: number; quote_id: number; mime: string; bytes: number }>(
          'SELECT id, quote_id, mime, bytes FROM quote_photos WHERE quote_id = ANY($1::int[]) ORDER BY id',
          [ids],
        )
      ).rows
    : []
  const byQuote = new Map<number, { id: number; mime: string; bytes: number }[]>()
  for (const p of photos) {
    const list = byQuote.get(p.quote_id) ?? []
    list.push({ id: p.id, mime: p.mime, bytes: p.bytes })
    byQuote.set(p.quote_id, list)
  }

  const inquiries = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    company: r.company,
    location: r.location,
    categories: r.categories,
    message: r.message,
    status: r.status,
    memo: r.memo,
    utm: {
      source: r.utm_source ?? '',
      medium: r.utm_medium ?? '',
      campaign: r.utm_campaign ?? '',
      term: r.utm_term ?? '',
      content: r.utm_content ?? '',
    },
    clickId: r.click_id ?? '',
    landingPath: r.landing_path ?? '',
    referrer: r.referrer ?? '',
    firstSeenAt: r.first_seen_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    photos: byQuote.get(r.id) ?? [],
  }))
  return json({ source: SOURCE_NAME, at: new Date().toISOString(), inquiries })
}
