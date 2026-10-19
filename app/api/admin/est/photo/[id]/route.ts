import { pool } from '@/lib/db'
import { canEnterAdmin, getAppSessionFrom } from '@/lib/session'
import { ensureEst } from '@/lib/est/table'

export const dynamic = 'force-dynamic'

/** 견적 현장 사진 한 장(DB bytea). 견적 역할이 있는 로그인 뒤에만 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getAppSessionFrom(req.headers).catch(() => null)
  if (!canEnterAdmin(s) || !s?.estRole) return new Response('로그인이 필요함', { status: 401 })
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) return new Response('잘못된 요청', { status: 400 })
  try {
    await ensureEst()
    const { rows } = await pool.query<{ mime: string | null; data: Buffer | null }>('SELECT mime, data FROM est_photo WHERE id = $1', [id])
    if (!rows[0]?.data) return new Response('없는 사진', { status: 404 })
    return new Response(new Uint8Array(rows[0].data), {
      headers: { 'Content-Type': rows[0].mime || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch (e) {
    console.error('[est/photo] 조회 실패', e)
    return new Response('조회 실패', { status: 500 })
  }
}
