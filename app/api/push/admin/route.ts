import { getSessionFrom, isAdmin } from '@/lib/admin'
import { pushAdmins, removeSubscription, saveSubscription, validSub } from '@/lib/notify/push'

export const dynamic = 'force-dynamic'

/** 관리자 휴대폰 등록(POST) · 해제(DELETE) · 시험 알림(POST {test:true}) */
export async function POST(req: Request) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return Response.json({ ok: false }, { status: 401 })
  const body = (await req.json().catch(() => null)) as { sub?: unknown; label?: string; test?: boolean } | null
  if (body?.test) {
    await pushAdmins({ title: '엔엠솔루션 알림 시험', body: '이 휴대폰으로 문의 알림이 옵니다.', url: '/admin/quotes' })
    return Response.json({ ok: true })
  }
  if (!validSub(body?.sub)) return Response.json({ ok: false, error: '구독 정보가 없습니다.' }, { status: 400 })
  await saveSubscription(body.sub, 'admin', null, body.label || '')
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return Response.json({ ok: false }, { status: 401 })
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null
  if (body?.endpoint) await removeSubscription(body.endpoint)
  return Response.json({ ok: true })
}
