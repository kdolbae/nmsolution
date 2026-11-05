import { getSessionFrom, isAdmin } from '@/lib/admin'
import { kakaoConnect } from '@/lib/notify/kakao'

export const dynamic = 'force-dynamic'

/** 카카오 동의 후 돌아오는 곳. 받은 code 로 refresh token 을 저장하고 견적 문의 화면으로 돌려보낸다 */
export async function GET(req: Request) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })
  const url = new URL(req.url)
  const back = (r: string) => Response.redirect(`${url.origin}/admin/quotes?kakao=${r}`, 303)
  const state = url.searchParams.get('state') || ''
  const cookie = req.headers.get('cookie')?.match(/(?:^|;\s*)nm_kakao_state=([a-f0-9]+)/)?.[1]
  const code = url.searchParams.get('code')
  if (!code || !cookie || cookie !== state) return back('fail')
  try {
    await kakaoConnect(code, url.origin)
    return back('on')
  } catch (e) {
    console.error('[kakao] 연결 실패', e)
    return back('fail')
  }
}
