import { pool } from '@/lib/db'
import { ensureQuotePhotos } from '@/lib/quote-photos'
import { checkKey, clientId, json } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

/** 견적 문의 현장 사진 한 장(원본 그대로). 고객 사진이라 SBworks 키로만 준다. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkKey(req)
  if (denied) return denied
  const id = clientId((await params).id)
  if (!id) return json({ error: '잘못된 사진 id.' }, 400)
  await ensureQuotePhotos()
  const { rows } = await pool.query<{ mime: string; data: Buffer }>('SELECT mime, data FROM quote_photos WHERE id = $1', [id])
  if (!rows[0]) return json({ error: '없는 사진.' }, 404)
  return new Response(new Uint8Array(rows[0].data), {
    headers: { 'Content-Type': rows[0].mime, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}
