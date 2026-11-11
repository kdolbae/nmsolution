import { pool } from '@/lib/db'
import { ensureCards } from '@/lib/clients/cards'
import { checkKey, clientId, json } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

/** 명함 사진 원본(이관용). /api/sbworks/export 의 cards[].id */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkKey(req)
  if (denied) return denied
  const id = clientId((await params).id)
  if (!id) return json({ error: '명함을 찾을 수 없음.' }, 404)
  await ensureCards()
  const { rows } = await pool.query<{ image: Buffer | null; mime: string | null }>(`SELECT image, mime FROM client_cards WHERE id = $1`, [id])
  const r = rows[0]
  if (!r?.image || !r.mime) return json({ error: '명함 사진이 없음.' }, 404)
  return new Response(new Uint8Array(r.image), { headers: { 'Content-Type': r.mime, 'Cache-Control': 'no-store' } })
}
