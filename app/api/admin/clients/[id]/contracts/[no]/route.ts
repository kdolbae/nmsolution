import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'
import { pool } from '@/lib/db'
import { buildContractHtml, ensureContracts, getContract } from '@/lib/contracts/table'
import { contractPage } from '@/lib/contracts/page'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 계약서 미리보기·인쇄·PDF (관리자 전용).
 * 작성 중이면 지금 입력값으로, 발행한 뒤에는 발행 때 굳힌 내용으로 만든다.
 * ?pdf=1 PDF 내려받기, ?print=1 인쇄용 화면(열리면 바로 인쇄 창)
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; no: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const p = await params
  const client = await getClient(Number(p.id))
  const c = client ? await getContract(client.id, Number(p.no)) : null
  if (!client || !c) return new Response('없는 계약서', { status: 404 })

  let html: string
  let proposalHtml: string
  if (c.status === 'draft') {
    ;({ html, proposalHtml } = await buildContractHtml(c))
  } else {
    await ensureContracts()
    const { rows } = await pool.query<{ snapshot_html: string | null; proposal_html: string | null }>(
      `SELECT snapshot_html, proposal_html FROM client_contracts WHERE id = $1`,
      [c.id],
    )
    html = rows[0]?.snapshot_html ?? ''
    proposalHtml = rows[0]?.proposal_html ?? ''
  }
  const sp = new URL(req.url).searchParams
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' }
  if (sp.get('pdf') === '1') {
    const pdf = await htmlToPdf(contractPage(c, html, '', { print: true }), req)
    return pdfResponse(pdf, `${client.name} 공사 도급 계약서 ${c.number}${c.status === 'draft' ? ' (작성 중)' : ''}.pdf`)
  }
  if (sp.get('print') === '1')
    return new Response(contractPage(c, html, '', { print: true }).replace('</body>', '<script>window.onload=function(){window.print()}</script></body>'), { headers })
  const banner =
    c.status === 'draft'
      ? '<div class="nmc-banner" style="background:#fff7e6;color:#92400e;text-align:center;padding:8px;font:600 13px Pretendard,sans-serif">작성 중 미리보기 · 발행 전이라 내용이 바뀔 수 있음 · 관리자만 보임</div>'
      : '<div class="nmc-banner" style="background:#eef3ff;color:#0F2A44;text-align:center;padding:8px;font:600 13px Pretendard,sans-serif">관리자 미리보기 · 고객 링크와 같은 내용</div>'
  return new Response(contractPage(c, html, proposalHtml, { pdfHref: '?pdf=1', banner }), { headers })
}
