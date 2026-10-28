import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient, getVersion } from '@/lib/clients/table'
import { printHtml } from '@/lib/clients/print'
import { withSentNumber } from '@/lib/clients/sends'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 제안서·견적서 PDF 바로 내려받기 (인쇄 창 없이). docs=both | proposal | quote, version=n 이면 그 버전 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })

  const found = await getClient(Number((await params).id))
  if (!found) return new Response('없는 업체', { status: 404 })

  const sp = new URL(req.url).searchParams
  const docs = sp.get('docs') ?? 'both'
  let suffix = ''
  let version: number | undefined
  if (sp.get('version')) {
    const v = await getVersion(found.id, Number(sp.get('version')))
    if (!v) return new Response('없는 버전', { status: 404 })
    found.proposalHtml = v.proposalHtml
    found.quote = v.quote
    version = v.no
    suffix = ` v${v.no}${found.finalized?.version === v.no ? ' 최종본' : ''}`
  }
  // 고객에게 발송한 버전이면 발송 견적번호(-R1 등)로 찍는다
  const client = await withSentNumber(found, version)
  const label = docs === 'quote' || !client.proposalHtml ? '견적서' : docs === 'proposal' ? '제안서' : '제안서·견적서'
  const pdf = await htmlToPdf(printHtml(client, docs, suffix), req)
  return pdfResponse(pdf, `${client.name} ${label}${suffix}.pdf`)
}
