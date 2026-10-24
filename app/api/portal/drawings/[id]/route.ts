import { getClientBySlug } from '@/lib/clients/table'
import { hasPortalAccess, portalCookieName, readCookie } from '@/lib/clients/portal'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getDrawing } from '@/lib/drawings/table'

/**
 * 업체 페이지(예: /adreaming)의 보기 전용 3D 도면 데이터. ?slug=<업체 주소>
 * 그 업체 링크 쿠키가 있고, 도면이 그 업체에 붙어 "업체 페이지에 표시"일 때만 내준다. 관리자는 미리보기로 볼 수 있다.
 */
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const slug = new URL(req.url).searchParams.get('slug') ?? ''
  const d = await getDrawing(Number((await params).id))
  const session = await getSessionFrom(req.headers)
  const adminView = !!(session?.user && isAdmin(session.user))
  if (!d) return json({ error: 'Not Found' }, 404)
  if (!adminView) {
    const client = slug ? await getClientBySlug(slug) : null
    const ok = client && d.clientId === client.id && d.showOnPortal && (await hasPortalAccess(slug, readCookie(req, portalCookieName(slug))))
    if (!ok) return json({ error: 'Not Found' }, 404)
  }
  return json({ drawing: { id: d.id, title: d.title, model: d.model, rev: d.rev, summary: '' } })
}
