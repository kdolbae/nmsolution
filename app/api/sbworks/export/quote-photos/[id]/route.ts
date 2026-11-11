import { pool } from '@/lib/db'
import { ensureQuotePhotos } from '@/lib/quote-photos'
import { checkKey, clientId, json } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

/** 견적 문의 현장 사진 원본(이관용). /api/sbworks/export/site 의 photos[].id */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkKey(req)
  if (denied) return denied
  const id = clientId((await params).id)
  if (!id) return json({ error: '사진을 찾을 수 없음.' }, 404)
  await ensureQuotePhotos()
  const { rows } = await pool.query<{ data: Buffer | null; mime: string | null }>(`SELECT data, mime FROM quote_photos WHERE id = $1`, [id])
  const r = rows[0]
  if (!r?.data || !r.mime) return json({ error: '사진이 없음.' }, 404)
  return new Response(new Uint8Array(r.data), { headers: { 'Content-Type': r.mime, 'Cache-Control': 'no-store' } })
}
