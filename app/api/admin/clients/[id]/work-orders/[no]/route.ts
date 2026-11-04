import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { getWorkOrder } from '@/lib/work-orders/table'
import { workOrderHtml } from '@/lib/work-orders/render'

export const dynamic = 'force-dynamic'

/** 관리자 보기: 업무 지시서를 현장 팀 링크와 같은 모양으로 보여 준다(접속 기록 없음) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; no: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const p = await params
  const client = await getClient(Number(p.id))
  if (!client) return new Response('없는 업체', { status: 404 })
  const wo = await getWorkOrder(client.id, Number(p.no))
  if (!wo) return new Response('없는 업무 지시서', { status: 404 })
  const base = `/api/admin/clients/${client.id}/work-orders/${wo.no}`
  const banner = `관리자 보기 · ${wo.status === 'issued' ? `현장 팀 링크 nm-solution.co.kr/work/${wo.shareKey.slice(0, 6)}… 로 열림` : '초안이라 현장 팀 링크가 닫혀 있음'} <a href="/admin/clients/${client.id}">어드민으로</a>`
  const html = workOrderHtml(wo, client, { pdfHref: `${base}/pdf`, banner })
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } })
}
