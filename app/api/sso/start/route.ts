import { NextResponse, type NextRequest } from 'next/server'
import { NEXT_COOKIE, STATE_COOKIE, safeNext, ssoAppId, ssoEnabled, ssoIssuer, ssoStateSecret } from '@/lib/sso/config'
import { randomHex } from '@/lib/sso/crypto'
import { STATE_TTL_SEC, makeStateCookie } from '@/lib/sso/state'

export const dynamic = 'force-dynamic'

/** SBworks 로 로그인 시작: state·nonce 를 만들어 서명 쿠키에 두고 SBworks /sso/authorize 로 보냄 (§3.2) */
export async function GET(req: NextRequest) {
  const secret = ssoStateSecret()
  if (!ssoEnabled() || !secret) return NextResponse.redirect(new URL('/admin/login?error=sso_disabled', req.url))

  const state = randomHex(16)
  const nonce = randomHex(16)
  const exp = Math.floor(Date.now() / 1000) + STATE_TTL_SEC
  const redirectUri = new URL('/api/sso/callback', req.nextUrl.origin).toString()

  const to = new URL('/sso/authorize', ssoIssuer())
  to.searchParams.set('app', ssoAppId())
  to.searchParams.set('redirect_uri', redirectUri)
  to.searchParams.set('state', state)
  to.searchParams.set('nonce', nonce)

  const res = NextResponse.redirect(to, 302)
  const secure = req.nextUrl.protocol === 'https:'
  const opts = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/api/sso', maxAge: STATE_TTL_SEC }
  res.cookies.set(STATE_COOKIE, makeStateCookie(state, nonce, exp, secret), opts)
  res.cookies.set(NEXT_COOKIE, safeNext(req.nextUrl.searchParams.get('next')), opts)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
