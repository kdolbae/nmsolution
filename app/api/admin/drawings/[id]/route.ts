import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getDrawing, recentVersions, RevConflict, saveModel, setChat, type ChatMsg, type DrawingModel } from '@/lib/drawings/table'

/**
 * 배관 도면 작성 화면(public/drawing-board/board.html)이 읽고 쓰는 곳.
 * GET: 도면 + 되돌리기용 최근 버전. PUT: { model, summary, baseRev } 저장 또는 { chat } 대화 기록 저장.
 */

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

async function admin(req: Request) {
  const session = await getSessionFrom(req.headers)
  return session?.user && isAdmin(session.user) ? session.user : null
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await admin(req))) return json({ error: '로그인이 필요합니다.' }, 401)
  const id = Number((await params).id)
  const d = await getDrawing(id)
  if (!d) return json({ error: '없는 도면' }, 404)
  const versions = new URL(req.url).searchParams.get('versions') === '0' ? null : await recentVersions(id)
  return json({ drawing: d, versions })
}

function validModel(m: unknown): m is DrawingModel {
  if (!m || typeof m !== 'object') return false
  const nodes = (m as DrawingModel).nodes ?? {}
  if (typeof nodes !== 'object') return false
  for (const p of Object.values(nodes)) if (!Array.isArray(p) || p.length !== 3 || p.some((v) => typeof v !== 'number' || !Number.isFinite(v))) return false
  const lines = (m as DrawingModel).lines ?? []
  return Array.isArray(lines) && lines.every((l) => Array.isArray(l?.path) && l.path.every((id) => typeof id === 'string' && id in nodes))
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await admin(req)
  if (!user) return json({ error: '로그인이 필요합니다.' }, 401)
  const id = Number((await params).id)
  const body = (await req.json().catch(() => null)) as { model?: unknown; summary?: string; baseRev?: number; chat?: ChatMsg[] } | null
  if (!body) return json({ error: '잘못된 요청' }, 400)
  if (Array.isArray(body.chat)) {
    await setChat(id, body.chat.filter((m) => m && typeof m.text === 'string').map((m) => ({ role: m.role === 'user' ? 'user' : 'claude', text: m.text.slice(0, 4000), at: String(m.at ?? ''), photos: m.photos })))
    return json({ ok: true })
  }
  if (!validModel(body.model)) return json({ error: '도면 형식이 맞지 않습니다.' }, 400)
  try {
    const rev = await saveModel(id, body.model, String(body.summary ?? '').slice(0, 300), user.name || user.email, Number(body.baseRev))
    return json({ rev })
  } catch (e) {
    if (e instanceof RevConflict) return json({ error: e.message, drawing: e.current }, 409)
    throw e
  }
}
