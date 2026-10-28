import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClientBySlug, getClient, getVersion } from '@/lib/clients/table'
import { portalPageHtml } from '@/lib/clients/portal-route'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 관리자 미리보기: 아직 발송하지 않은 내부 버전 v 를 고객 업체 페이지와 똑같은 모양으로 보여 준다(?pdf=1 이면 PDF).
 * 관리자 로그인에서만 열리고 고객 화면·발송 이력·접속 기록에는 아무것도 남기지 않는다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const p = await params
  const base = await getClient(Number(p.id))
  if (!base) return new Response('없는 업체', { status: 404 })
  const url = new URL(req.url)
  const version = await getVersion(base.id, Number(url.searchParams.get('v')))
  if (!version) return new Response('없는 버전', { status: 404 })
  const client = (base.portalSlug && (await getClientBySlug(base.portalSlug))) || { ...base, portalPasswordHash: '', shareHash: '', shareExpires: null }
  const html = portalPageHtml(client, { no: 0, proposalHtml: version.proposalHtml, quote: version.quote })
  if (url.searchParams.get('pdf') === '1') {
    return pdfResponse(await htmlToPdf(html, req), `${client.name} 미리보기 v${version.no}.pdf`)
  }
  const bar = `<div style="position:sticky;top:0;z-index:9999;background:#E8742A;color:#fff;font:600 13px/1.4 Pretendard,sans-serif;padding:8px 16px;text-align:center">미리보기 · 내부 v${version.no} · 고객에게 보이지 않음. 고객 발송본으로 확정해야 업체 페이지에 나감 · <a href="?v=${version.no}&pdf=1" style="color:#fff">PDF</a></div>`
  // 업체 페이지의 PDF 버튼(?pdf=1)이 이 미리보기 버전을 받게 v 를 붙인다
  const page = html.replace('class="nm-pdf" href="?pdf=1"', `class="nm-pdf" href="?v=${version.no}&pdf=1"`)
  const out = /<body[^>]*>/i.test(html) ? page.replace(/<body[^>]*>/i, (m) => m + bar) : bar + page
  return new Response(out, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } })
}
