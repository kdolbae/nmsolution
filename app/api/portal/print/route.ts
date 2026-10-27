import { printHtml } from '@/lib/clients/print'
import { bookFrameHtml, bookShellHtml } from '@/lib/clients/book'
import { approvedClientId, portalDocs } from '@/lib/portal/access'
import { logAccess } from '@/lib/clients/access-log'
import { after } from 'next/server'

export const dynamic = 'force-dynamic'

/** 협력업체 포털 인쇄(PDF로 저장). 승인된 관계자가 자기 업체 것만 받는다 */
export async function GET(req: Request) {
  const clientId = await approvedClientId(req.headers)
  if (!clientId) return new Response('로그인이 필요합니다.', { status: 401 })
  const client = await portalDocs(clientId)
  if (!client) return new Response('없는 업체', { status: 404 })
  const url = new URL(req.url)
  const docs = url.searchParams.get('docs') ?? 'both'
  if (url.searchParams.get('frame') !== '1') after(() => logAccess(req.headers, client, 'portal_print', { details: { docs } }))
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }
  if (docs === 'book') {
    const title = `${client.name} 제안서·견적서 제본용${client.label ? ` ${client.label}` : ''}`
    if (url.searchParams.get('frame') === '1') return new Response(bookFrameHtml(client, title), { headers })
    url.searchParams.set('frame', '1')
    return new Response(bookShellHtml(`${url.pathname}${url.search}`, title), { headers })
  }
  return new Response(printHtml(client, docs, client.label ? ` ${client.label}` : ' '), { headers })
}
