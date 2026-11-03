import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { generateWorkOrder } from '@/lib/work-orders/generate'
import { createWorkOrder } from '@/lib/work-orders/table'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** 업무 지시서 초안 만들기 (Claude). JSON { note, baseNo? } → { no, number } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  const client = await getClient(Number((await params).id))
  if (!client) return json({ error: '업체를 찾을 수 없습니다.' }, 404)
  const body = (await req.json().catch(() => ({}))) as { note?: unknown; baseNo?: unknown }
  const note = String(body.note ?? '').trim().slice(0, 6000)
  const baseNo = Number(body.baseNo)
  try {
    const gen = await generateWorkOrder(client.id, note, Number.isSafeInteger(baseNo) && baseNo > 0 ? baseNo : undefined)
    if (!gen.markdown) return json({ error: '빈 지시서가 돌아왔음. 다시 시도해 주기 바람.' }, 500)
    const by = session.user.name?.trim() || session.user.email || ''
    const meta = await createWorkOrder(client.id, by, { quoteNumber: client.quote.number, markdown: gen.markdown, title: gen.title, note, model: gen.model })
    return json({ ok: true, no: meta.no, number: meta.number })
  } catch (e) {
    console.error('[work-order] 생성 실패', e)
    return json({ error: e instanceof Error ? e.message : '업무 지시서를 만들지 못했습니다.' }, 500)
  }
}
