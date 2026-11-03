import { after } from 'next/server'
import { getClient } from '@/lib/clients/table'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'
import { logAccess, trackedHtml } from '@/lib/clients/access-log'
import { getWorkOrderByKey } from '@/lib/work-orders/table'
import { workOrderHtml } from '@/lib/work-orders/render'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' }

/**
 * 현장 팀 링크 nm-solution.co.kr/work/<키>: 발행한 업무 지시서를 비밀번호 없이 연다(키가 길어 추측 불가).
 * 열람·PDF 는 접속 기록(work_order_view·work_order_pdf)에 남는다. 초안·없는 키는 404.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const wo = await getWorkOrderByKey((await params).key)
  if (!wo) return new Response('Not Found', { status: 404, headers: NO_STORE })
  const client = await getClient(wo.clientId)
  if (!client) return new Response('Not Found', { status: 404, headers: NO_STORE })
  const slug = client.portalSlug || `client-${client.id}`
  if (new URL(req.url).searchParams.get('pdf') === '1') {
    after(() => logAccess(req.headers, client, 'work_order_pdf', { slug, details: { workOrder: wo.number } }))
    const pdf = await htmlToPdf(workOrderHtml(wo, client), req)
    return pdfResponse(pdf, `업무지시서 ${wo.number}.pdf`)
  }
  const html = workOrderHtml(wo, client, { pdfHref: '?pdf=1' })
  return new Response(trackedHtml(html, req.headers, slug, { client, kind: 'work_order_view', details: { workOrder: wo.number } }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE },
  })
}
