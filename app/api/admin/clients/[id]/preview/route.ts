import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient, getClientBySlug, getVersion } from '@/lib/clients/table'
import { isPortalHidden } from '@/lib/clients/sends'
import { customerView, portalPageHtml } from '@/lib/clients/portal-route'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 고객 페이지 미리보기 (관리자 전용). 지금 업체가 보는 화면을 그대로 보여 준다(같은 customerView).
 * ?s=N·?cmp=N·?pdf=1 도 업체 페이지와 똑같이 움직인다. 접속 기록은 남기지 않고, 맨 위에 미리보기 띠를 붙인다.
 * ?v=N 이면 아직 발송하지 않은 내부 버전 N 을 업체 페이지 모양으로 보여 준다(업체에는 안 보임).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const row = await getClient(Number((await params).id))
  if (!row) return new Response('없는 업체', { status: 404 })
  const client = (row.portalSlug && (await getClientBySlug(row.portalSlug))) || { ...row, portalPasswordHash: '', shareHash: '', shareExpires: null }
  const base = `/api/admin/clients/${row.id}/preview`
  const sp = new URL(req.url).searchParams
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }

  // 내부 버전 미리보기: 발송 전 모습 확인용
  if (sp.has('v')) {
    const v = await getVersion(row.id, Number(sp.get('v')))
    if (!v) return new Response('없는 버전', { status: 404 })
    const doc = { no: 0, proposalHtml: v.proposalHtml, quote: v.quote }
    if (sp.get('pdf') === '1') return pdfResponse(await htmlToPdf(portalPageHtml(client, doc), req), `${client.name} 제안서·견적서 내부 v${v.no}.pdf`)
    const html = portalPageHtml(client, doc).replace('href="?pdf=1"', `href="?v=${v.no}&pdf=1"`)
    const bar = `<div style="position:sticky;top:0;z-index:100;background:#b42318;color:#fff;font:600 13px/1.4 Pretendard,'Apple SD Gothic Neo',sans-serif;padding:7px 16px;text-align:center">미리보기 · 내부 v${v.no} · 아직 발송 전이라 고객에게 보이지 않음 <a href="${base}" style="color:#fff;margin-left:10px">지금 고객 화면</a> <a href="/admin/clients/${row.id}" style="color:#fff;margin-left:10px">어드민으로</a></div>`
    return new Response(/<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + bar) : bar + html, { headers })
  }
  const view = await customerView(client, sp, base)
  if (view.type === 'redirect') return new Response(null, { status: 303, headers: { Location: view.to } })
  if (view.type === 'page' && sp.get('pdf') === '1') {
    return pdfResponse(await htmlToPdf(portalPageHtml(client, view.send), req), `${client.name} 제안서·견적서 ${view.send.number}.pdf`)
  }
  const hidden = await isPortalHidden(row.id)
  const note = hidden
    ? '업체 페이지 공개를 꺼 두어 업체에는 &lsquo;준비 중&rsquo;만 보임'
    : row.portalSlug
      ? `업체가 nm-solution.co.kr/${row.portalSlug} 에서 보는 화면과 같음`
      : '업체용 링크 주소가 아직 없음'
  const banner = `<div style="position:${view.type === 'empty' ? 'fixed;left:0;right:0' : 'sticky'};top:0;z-index:100;background:#E8742A;color:#fff;font:600 13px/1.4 Pretendard,'Apple SD Gothic Neo',sans-serif;padding:7px 16px;text-align:center">관리자 미리보기 · ${note} · 접속 기록 안 남음 <a href="/admin/clients/${row.id}" style="color:#fff;margin-left:10px">어드민으로</a></div>`
  const html = /<body[^>]*>/i.test(view.html) ? view.html.replace(/<body[^>]*>/i, (m) => m + banner) : banner + view.html
  return new Response(html, { headers })
}
