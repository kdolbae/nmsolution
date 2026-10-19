import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient, getVersion } from '@/lib/clients/table'
import { printHtml } from '@/lib/clients/print'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 제안서·견적서 PDF 바로 내려받기 (인쇄 창 없이). docs=both | proposal | quote, version=n 이면 그 버전 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })

  const client = await getClient(Number((await params).id))
  if (!client) return new Response('없는 업체', { status: 404 })

  const sp = new URL(req.url).searchParams
  const docs = sp.get('docs') ?? 'both'
  let suffix = ''
  if (sp.get('version')) {
    const v = await getVersion(client.id, Number(sp.get('version')))
    if (!v) return new Response('없는 버전', { status: 404 })
    client.proposalHtml = v.proposalHtml
    client.quote = v.quote
    suffix = ` v${v.no}${client.finalized?.version === v.no ? ' 최종본' : ''}`
  }
  const label = docs === 'quote' || !client.proposalHtml ? '견적서' : docs === 'proposal' ? '제안서' : '제안서·견적서'
  const pdf = await htmlToPdf(printHtml(client, docs, suffix), req)
  return pdfResponse(pdf, `${client.name} ${label}${suffix}.pdf`)
}
