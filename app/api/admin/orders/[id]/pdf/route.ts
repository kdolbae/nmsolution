import { getSessionFrom, isAdmin } from '@/lib/admin'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'
import { renderOrderHtml } from '@/lib/orders/doc'
import { getOrder } from '@/lib/orders/table'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 발주서 PDF 내려받기 (A4 장 단위). 저장된 발주서 기준 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const row = await getOrder(Number((await params).id))
  if (!row) return new Response('없는 발주서', { status: 404 })
  const o = row.order
  const pdf = await htmlToPdf(renderOrderHtml(o), req)
  return pdfResponse(pdf, `발주서 ${o.no} ${o.supplier.name}${o.siteName ? ' ' + o.siteName : ''}.pdf`)
}
