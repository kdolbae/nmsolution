import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient, getVersion } from '@/lib/clients/table'
import { printHtml } from '@/lib/clients/print'
import { bookFrameHtml, bookShellHtml } from '@/lib/clients/book'

export const dynamic = 'force-dynamic'

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })

  const client = await getClient(Number((await params).id))
  if (!client) return new Response('없는 업체', { status: 404 })

  const sp = new URL(req.url).searchParams
  const docs = sp.get('docs') ?? 'both'
  let suffix = ''
  if (sp.get('version')) {
    const v = await getVersion(client.id, Number(sp.get('version')))
    if (!v) return new Response('없는 버전', { status: 404 })
    client.proposalHtml = v.proposalHtml
    client.quote = v.quote
    suffix = ` v${v.no}${client.finalized?.version === v.no ? ' 최종본' : ''}`
  }
  if (docs === 'book') {
    // 제본용: 인쇄 창(210mm 폭 iframe) → 같은 주소에 frame=1 을 붙인 실제 쪽 문서
    const title = `${client.name} 제안서·견적서 제본용${suffix}`
    if (sp.get('frame') === '1') return new Response(bookFrameHtml(client, title), { headers: HEADERS })
    const u = new URL(req.url)
    u.searchParams.set('frame', '1')
    return new Response(bookShellHtml(`${u.pathname}${u.search}`, title), { headers: HEADERS })
  }
  const html = printHtml(client, docs, suffix)
  return new Response(html, { headers: HEADERS })
}
