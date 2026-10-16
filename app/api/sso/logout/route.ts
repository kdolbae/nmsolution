import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, ssoIssuer, ssoStateSecret } from '@/lib/sso/config'
import { readSessionCookie } from '@/lib/sso/state'
import { revokeSsoSession } from '@/lib/sso/session'

export const dynamic = 'force-dynamic'

/**
 * 앱 로그아웃: SSO 세션 폐기·쿠키 삭제 → /admin/login. all=1 이면 SBworks /auth/signout 으로 이어 보냄(§3.9).
 * 같은 출처 폼에서만(Origin 확인). SBworks 세션은 살아 있어 다음 SSO 는 바로 통과함(의도된 동작).
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && origin !== req.nextUrl.origin) return new NextResponse('Forbidden', { status: 403 })
  const secret = ssoStateSecret()
  const id = secret ? readSessionCookie(req.cookies.get(SESSION_COOKIE)?.value, secret) : null
  if (id) await revokeSsoSession(id).catch((e) => console.error('[sso] logout', e))
  const to = req.nextUrl.searchParams.get('all') === '1' ? new URL('/auth/signout', ssoIssuer()) : new URL('/admin/login', req.url)
  const res = NextResponse.redirect(to, 303)
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
