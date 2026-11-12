import { after } from 'next/server'
import { getClient } from '@/lib/clients/table'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'
import { logAccess, trackedHtml } from '@/lib/clients/access-log'
import { getWorkOrderByKey } from '@/lib/work-orders/table'
import { workOrderHtml } from '@/lib/work-orders/render'
import { ncmsWork } from '@/lib/clients/ncms-portal'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' }

/**
 * 현장 팀 링크 nm-solution.co.kr/work/<키>: N-CMS 에 있으면 N-CMS 화면(ncms-portal.ts), 없으면 예전 엔엠. 발행한 업무 지시서를 비밀번호 없이 연다(키가 길어 추측 불가).
 * 열람·PDF 는 접속 기록(work_order_view·work_order_pdf)에 남는다. 초안·없는 키는 404.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key
  // N-CMS 에서 발행한 업무 지시서면 N-CMS 화면(열람 기록·머문 시간·텔레그램은 N-CMS·ncms-portal.ts 가 한다)
  const ncms = await ncmsWork(req.clone(), key)
  if (ncms) return ncms
  const wo = await getWorkOrderByKey(key)
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

/** N-CMS 업무 지시서 화면 안 스크립트의 행동 기록(?pv=1)을 N-CMS 로 넘긴다 */
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const ncms = await ncmsWork(req, (await params).key)
  return ncms ?? new Response(null, { status: 204, headers: NO_STORE })
}
