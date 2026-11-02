import { after } from 'next/server'
import { logAccess, trackedHtml } from '@/lib/clients/access-log'
import { getClient } from '@/lib/clients/table'
import { PORTAL_MAX_AGE, portalCookieName, portalToken } from '@/lib/clients/portal'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'
import { addEvent, getContractByToken } from '@/lib/contracts/table'
import { contractPage } from '@/lib/contracts/page'

/**
 * 고객용 계약서 보기: nm-solution.co.kr/contract/<키> (전 업체 공통).
 * - 어드민에서 '발행'한 계약서만 열린다(취소하면 바로 닫힘). 키는 무작위 32자라 링크를 가진 사람만 연다.
 * - 고객은 계약서를 미리 읽고 PDF로 받거나 인쇄해 날인할 수 있다(서명은 서면 기명날인, 2026-11-02 kevin).
 * - 열람·PDF 는 업체 접속 기록(trackedHtml/logAccess)과 계약 진행 기록(contract_events)에 같이 남는다. 업체 화면에는 아무 표시 없음.
 * - 계약서를 열면 그 업체 사진(/client-assets)도 보이도록 업체 링크 쿠키를 준다(별첨 작업제안서 사진).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
}

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const c = await getContractByToken(token)
  const client = c ? await getClient(c.clientId) : null
  if (!c || !client) return new Response('Not Found', { status: 404, headers: NO_STORE })
  const slug = client.portalSlug || ''
  const details = { contract: c.number, status: c.status, version: c.versionNo }
  if (new URL(req.url).searchParams.get('pdf') === '1') {
    after(() => logAccess(req.headers, client, 'contract_pdf', { slug, details }))
    after(() => addEvent(c.id, 'customer_pdf', { h: req.headers }))
    const pdf = await htmlToPdf(contractPage(c, c.snapshotHtml, '', { print: true }), req)
    return pdfResponse(pdf, `${client.name} 공사 도급 계약서 ${c.number}.pdf`)
  }
  after(() => addEvent(c.id, 'customer_view', { h: req.headers }))
  const html = contractPage(c, c.snapshotHtml, c.proposalHtml, { pdfHref: '?pdf=1' })
  const headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE }
  const cookie = slug ? await portalToken(slug) : null
  if (cookie) headers['Set-Cookie'] = `${portalCookieName(slug)}=${cookie}; Path=/; Max-Age=${PORTAL_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`
  return new Response(trackedHtml(html, req.headers, slug, { client, kind: 'contract_view', details }), { headers })
}
