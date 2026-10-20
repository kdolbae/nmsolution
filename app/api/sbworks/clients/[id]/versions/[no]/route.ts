import { getVersion } from '@/lib/clients/table'
import { checkKey, clientId, json, quoteView } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

/** 지난 버전의 견적서 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; no: string }> }) {
  const denied = checkKey(req)
  if (denied) return denied
  const p = await params
  const id = clientId(p.id)
  const v = id ? await getVersion(id, Number(p.no)) : null
  if (!v) return json({ error: '버전을 찾을 수 없음.' }, 404)
  return json({ no: v.no, change: v.change, summary: v.summary, by: v.by, at: v.at.toISOString(), quote: quoteView(v.quote) })
}
