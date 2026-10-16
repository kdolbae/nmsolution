import { NextResponse, type NextRequest } from 'next/server'
import { NEXT_COOKIE, SESSION_COOKIE, STATE_COOKIE, safeNext, ssoAppId, ssoEnabled, ssoIssuer, ssoStateSecret } from '@/lib/sso/config'
import { parseStateCookie, signSessionCookie } from '@/lib/sso/state'
import { safeEqual } from '@/lib/sso/crypto'
import { verifySsoToken } from '@/lib/sso/verify'
import { jwksLookup } from '@/lib/sso/jwks'
import { consumeJti, createSsoSession, linkUser } from '@/lib/sso/session'
import { estRoleFor } from '@/lib/est/perm'
import { getSettings } from '@/lib/est/settings'
import { sNum, sObj } from '@/lib/est/settings-defaults'

export const dynamic = 'force-dynamic'

function fail(req: NextRequest, code: string) {
  const res = NextResponse.redirect(new URL(`/admin/login?error=${code}`, req.url), 302)
  res.cookies.set(STATE_COOKIE, '', { path: '/api/sso', maxAge: 0 })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/** SBworks 에서 돌아옴: state → 서명 → 클레임 → nonce → jti 1회용 → 사용자 → 세션 (§3.6) */
export async function GET(req: NextRequest) {
  const secret = ssoStateSecret()
  if (!ssoEnabled() || !secret) return fail(req, 'sso_disabled')
  const sp = req.nextUrl.searchParams
  const token = sp.get('token') ?? ''
  const state = sp.get('state') ?? ''

  // 1) state
  const st = parseStateCookie(req.cookies.get(STATE_COOKIE)?.value, secret, Math.floor(Date.now() / 1000))
  if (!st || !state || !safeEqual(st.state, state)) return fail(req, 'state_mismatch')

  // 2)~4) 서명·클레임·nonce
  const v = await verifySsoToken(token, { issuer: ssoIssuer(), audience: ssoAppId(), nonce: st.nonce, getKey: jwksLookup })
  if (!v.ok) return fail(req, v.code)
  const c = v.claims

  try {
    // 5) jti 1회용
    if (!(await consumeJti(c.jti, c.exp))) return fail(req, 'replayed')

    // 7) 견적 역할
    const settings = await getSettings()
    const estRole = estRoleFor(c.role.code, c.perms, sObj<Record<string, unknown>>(settings, 'sso.role_map'))
    if (!estRole) return fail(req, 'no_role')

    // 6) 사용자 찾기/만들기, 8)~9) 세션
    const userId = await linkUser(c, estRole)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip')
    const session = await createSsoSession(userId, sNum(settings, 'sso.session_hours'), ip, req.headers.get('user-agent'))

    const res = NextResponse.redirect(new URL(safeNext(req.cookies.get(NEXT_COOKIE)?.value), req.url), 302)
    res.cookies.set(SESSION_COOKIE, signSessionCookie(session.id, secret), {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      expires: session.expires,
    })
    res.cookies.set(STATE_COOKIE, '', { path: '/api/sso', maxAge: 0 })
    res.cookies.set(NEXT_COOKIE, '', { path: '/api/sso', maxAge: 0 })
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e) {
    console.error('[sso] callback', e)
    return fail(req, 'server_error')
  }
}
