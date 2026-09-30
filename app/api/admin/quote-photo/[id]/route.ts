import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { ensureQuotePhotos } from '@/lib/quote-photos'

export const dynamic = 'force-dynamic'

/** 견적 문의에 붙은 현장 사진 한 장. 고객 사진이라 관리자 로그인 뒤에만 준다. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return new Response('로그인이 필요합니다.', { status: 401 })

  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) return new Response('잘못된 요청', { status: 400 })

  try {
    await ensureQuotePhotos()
    const { rows } = await pool.query<{ mime: string; data: Buffer }>('SELECT mime, data FROM quote_photos WHERE id = $1', [id])
    if (!rows[0]) return new Response('없는 사진', { status: 404 })
    return new Response(new Uint8Array(rows[0].data), {
      headers: {
        'Content-Type': rows[0].mime,
        'Cache-Control': 'private, max-age=3600',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (e) {
    console.error('[admin/quote-photo] 조회 실패', e)
    return new Response('조회 실패', { status: 500 })
  }
}
