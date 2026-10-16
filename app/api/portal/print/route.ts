import { printHtml } from '@/lib/clients/print'
import { approvedClientId, portalDocs } from '@/lib/portal/access'

export const dynamic = 'force-dynamic'

/** 협력업체 포털 인쇄(PDF로 저장). 승인된 관계자가 자기 업체 것만 받는다 */
export async function GET(req: Request) {
  const clientId = await approvedClientId(req.headers)
  if (!clientId) return new Response('로그인이 필요합니다.', { status: 401 })
  const client = await portalDocs(clientId)
  if (!client) return new Response('없는 업체', { status: 404 })
  const docs = new URL(req.url).searchParams.get('docs') ?? 'both'
  return new Response(printHtml(client, docs, client.label ? ` ${client.label}` : ' '), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}
