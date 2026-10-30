import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient, getVersion } from '@/lib/clients/table'
import { printHtml } from '@/lib/clients/print'
import type { QuoteMark } from '@/lib/clients/quote'
import { withSentNumber } from '@/lib/clients/sends'
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

  const found = await getClient(Number((await params).id))
  if (!found) return new Response('없는 업체', { status: 404 })

  const sp = new URL(req.url).searchParams
  const docs = sp.get('docs') ?? 'both'
  let suffix = ''
  let version: number | undefined
  if (sp.get('version')) {
    const v = await getVersion(found.id, Number(sp.get('version')))
    if (!v) return new Response('없는 버전', { status: 404 })
    found.proposalHtml = v.proposalHtml
    found.quote = v.quote
    version = v.no
    suffix = ` v${v.no}${found.finalized?.version === v.no ? ' 최종본' : ''}`
  }
  // mark=N: N 버전 견적 대비 바뀐 곳을 빨간색으로 표시한 견적서(내부용)
  let mark: QuoteMark | undefined
  if (sp.get('mark')) {
    const m = await getVersion(found.id, Number(sp.get('mark')))
    if (!m) return new Response('없는 버전', { status: 404 })
    mark = { base: m.quote, label: `v${m.no} (${kst(m.at)}) 견적` }
    suffix += ` 변경 표시 (v${m.no} 대비)`
  }
  // 고객에게 발송한 버전이면 발송 견적번호(-R1 등)로 찍는다
  const client = await withSentNumber(found, version)
  if (docs === 'book') {
    // 제본용: 인쇄 창(210mm 폭 iframe) → 같은 주소에 frame=1 을 붙인 실제 쪽 문서
    const title = `${client.name} 제안서·견적서 제본용${suffix}`
    if (sp.get('frame') === '1') return new Response(bookFrameHtml(client, title), { headers: HEADERS })
    const u = new URL(req.url)
    u.searchParams.set('frame', '1')
    return new Response(bookShellHtml(`${u.pathname}${u.search}`, title), { headers: HEADERS })
  }
  const html = printHtml(client, mark ? 'quote' : docs, suffix, mark)
  return new Response(html, { headers: HEADERS })
}

/** 2026-10-19 14:20 (한국 시각) */
function kst(d: Date) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }).format(d)
}
