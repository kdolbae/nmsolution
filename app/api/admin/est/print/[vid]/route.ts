import { canEnterAdmin, getAppSessionFrom } from '@/lib/session'
import { customerDocument, type DocKind } from '@/lib/est/print'
import { customerDocFor } from '@/lib/est/print-db'

export const dynamic = 'force-dynamic'

/**
 * 고객용 출력물 HTML(S9). ?docs=quote,detail,basis — 브라우저 인쇄로 PDF 저장.
 * 승인 전 판은 "검토용(제출 불가)" 워터마크(§9).
 */
export async function GET(req: Request, { params }: { params: Promise<{ vid: string }> }) {
  const s = await getAppSessionFrom(req.headers).catch(() => null)
  if (!canEnterAdmin(s) || !s?.estRole) return new Response('로그인이 필요함', { status: 401 })
  const vid = Number((await params).vid)
  if (!Number.isInteger(vid) || vid <= 0) return new Response('잘못된 요청', { status: 400 })
  const want = (new URL(req.url).searchParams.get('docs') ?? 'quote,detail,basis').split(',')
  const docs = want.filter((k): k is DocKind => k === 'quote' || k === 'detail' || k === 'basis')
  try {
    const r = await customerDocFor(vid)
    if (!r) return new Response('없는 판', { status: 404 })
    return new Response(customerDocument(r.doc, docs.length ? docs : ['quote']), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  } catch (e) {
    console.error('[est/print]', e)
    return new Response('출력물을 만들지 못함', { status: 500 })
  }
}
