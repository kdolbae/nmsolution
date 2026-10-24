import { getSessionFrom, isAdmin } from '@/lib/admin'
import { RevConflict, undoDrawing } from '@/lib/drawings/table'

/** 배관 도면 되돌리기: 바로 전 버전으로. 되돌린 결과도 새 버전으로 남는다 */
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  const body = (await req.json().catch(() => ({}))) as { baseRev?: number }
  try {
    const rev = await undoDrawing(Number((await params).id), session.user.name || session.user.email, Number(body.baseRev))
    return rev ? json({ rev }) : json({ error: '되돌릴 버전이 없습니다.' }, 409)
  } catch (e) {
    if (e instanceof RevConflict) return json({ error: e.message }, 409)
    throw e
  }
}
