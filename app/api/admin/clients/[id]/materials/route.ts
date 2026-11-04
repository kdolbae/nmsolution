import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { suggestMaterials } from '@/lib/materials/generate'
import { getMaterials, saveMaterials } from '@/lib/materials/table'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Claude 로 부자재 보강: 지금 리스트에 없는 것만 더해 저장한다. JSON { hint } → { added } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  const client = await getClient(Number((await params).id))
  if (!client) return json({ error: '업체를 찾을 수 없습니다.' }, 404)
  const body = (await req.json().catch(() => ({}))) as { hint?: unknown }
  try {
    const cur = await getMaterials(client.id)
    const { items } = await suggestMaterials(client.id, cur.items, String(body.hint ?? '').slice(0, 3000))
    const have = new Set(cur.items.map((x) => x.name.replace(/\s+/g, '').toLowerCase()))
    const added = items.filter((x) => !have.has(x.name.replace(/\s+/g, '').toLowerCase()))
    await saveMaterials(client.id, [...cur.items, ...added], session.user.name?.trim() || session.user.email || '')
    return json({ ok: true, added: added.length })
  } catch (e) {
    console.error('[materials] 보강 실패', e)
    return json({ error: e instanceof Error ? e.message : '부자재를 찾지 못했습니다.' }, 500)
  }
}
