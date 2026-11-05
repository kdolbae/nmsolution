import { randomBytes } from 'node:crypto'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { kakaoAuthorizeUrl, kakaoConfigured, kakaoSave } from '@/lib/notify/kakao'

export const dynamic = 'force-dynamic'

/** 관리자 → 견적 문의 → '카카오톡 알림 연결'. 카카오 동의 화면으로 보낸다. ?off=1 이면 연결을 끊는다 */
export async function GET(req: Request) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const url = new URL(req.url)
  if (url.searchParams.get('off') === '1') {
    await kakaoSave(null)
    return Response.redirect(`${url.origin}/admin/quotes?kakao=off`, 303)
  }
  if (!kakaoConfigured()) return new Response('Vercel 환경변수 KAKAO_REST_API_KEY 를 먼저 넣고 다시 배포해 주세요.', { status: 400 })
  const state = randomBytes(16).toString('hex')
  return new Response(null, {
    status: 302,
    headers: {
      Location: kakaoAuthorizeUrl(url.origin, state),
      'Set-Cookie': `nm_kakao_state=${state}; Path=/api/admin/kakao; Max-Age=600; HttpOnly; SameSite=Lax; Secure`,
    },
  })
}
