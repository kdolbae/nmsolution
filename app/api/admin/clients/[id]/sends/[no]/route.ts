import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClientBySlug, getClient } from '@/lib/clients/table'
import { getSend, listSends } from '@/lib/clients/sends'
import { portalPageHtml } from '@/lib/clients/portal-route'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 관리자 미리보기: 고객이 받은 발송본 N 을 업체 페이지와 똑같이 보여 준다(?pdf=1 이면 PDF). 접속 기록은 남기지 않는다 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; no: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const p = await params
  const base = await getClient(Number(p.id))
  if (!base) return new Response('없는 업체', { status: 404 })
  const send = await getSend(base.id, Number(p.no), { withWithdrawn: true })
  if (!send) return new Response('없는 발송본', { status: 404 })
  const client = (base.portalSlug && (await getClientBySlug(base.portalSlug))) || { ...base, portalPasswordHash: '', shareHash: '', shareExpires: null }
  if (new URL(req.url).searchParams.get('pdf') === '1') {
    return pdfResponse(await htmlToPdf(portalPageHtml(client, send), req), `${client.name} 제안서·견적서 ${send.number}.pdf`)
  }
  const sends = await listSends(base.id)
  const html = portalPageHtml(client, send, sends.some((s) => s.no === send.no) ? { base: `/api/admin/clients/${base.id}/preview`, sends } : undefined)
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } })
}
