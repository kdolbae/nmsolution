import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'
import { getWorkOrder } from '@/lib/work-orders/table'
import { workOrderHtml } from '@/lib/work-orders/render'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 업무 지시서 PDF (관리자) */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; no: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const p = await params
  const client = await getClient(Number(p.id))
  if (!client) return new Response('없는 업체', { status: 404 })
  const wo = await getWorkOrder(client.id, Number(p.no))
  if (!wo) return new Response('없는 업무 지시서', { status: 404 })
  const pdf = await htmlToPdf(workOrderHtml(wo, client), req)
  return pdfResponse(pdf, `업무지시서 ${wo.number} ${client.name}.pdf`)
}
