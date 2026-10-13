import { hasKktAccess, isKktPassword } from '@/lib/kkt-access'
import { cookieValue, NO_STORE } from '../http'
import { QUOTE_HTML } from '../page-html'

/**
 * 견적서 본문. 페이지 맨 아래 잠금 칸에서 비밀번호를 넣을 때마다 POST 로 받아 간다.
 * 쿠키를 남기지 않으므로 열 때마다 다시 입력해야 한다. 페이지 접근 쿠키가 없으면 없는 주소처럼 404.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await hasKktAccess(cookieValue(req)))) {
    return new Response('Not Found', { status: 404, headers: NO_STORE })
  }
  const form = await req.formData().catch(() => null)
  if (!(await isKktPassword(String(form?.get('password') ?? '')))) {
    await new Promise((r) => setTimeout(r, 1500))
    return new Response('', { status: 401, headers: NO_STORE })
  }
  return new Response(QUOTE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } })
}
