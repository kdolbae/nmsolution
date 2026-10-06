import { auth } from '@/lib/auth'
import { notifyConfigured, notifyQuote } from '@/lib/notify'

export const dynamic = 'force-dynamic'

/**
 * 알림이 실제로 닿는지 한 번 시험한다. 관리자 로그인 뒤에만 열린다.
 * 접수가 아니라 가짜 문의 하나를 알림 수단으로만 보낸다(DB 에는 아무것도 적지 않는다).
 * 켜진 수단과 수단별 성공 여부만 돌려주고, 키·번호는 돌려주지 않는다.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return new Response('로그인이 필요합니다.', { status: 401 })

  const on = notifyConfigured()
  if (!on.teams && !on.ntfy && !on.solapi) {
    return Response.json({ ok: false, configured: on, error: '알림 수단이 하나도 켜져 있지 않습니다(TEAMS_WEBHOOK_URL, NTFY_TOPIC, SOLAPI_* 환경변수).' })
  }
  const results = await notifyQuote(
    { id: 0, name: '시험 발송', phone: '010-0000-0000', location: '시험', categories: '알림 점검', message: '관리자 화면에서 보낸 시험 알림입니다.' },
    { bypassCap: true },
  )
  return Response.json({ ok: results.length > 0 && results.every((r) => r.ok), configured: on, results })
}
