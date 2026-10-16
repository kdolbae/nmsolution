import { cookies, headers } from 'next/headers'
import { getSession, getSessionFrom } from '@/lib/admin'
import { pool } from '@/lib/db'
import { ensureSso } from '@/lib/est/table'
import { atLeast, isEstRole, type EstRole } from '@/lib/est/perm'
import { SESSION_COOKIE, ssoStateSecret } from '@/lib/sso/config'
import { readSessionCookie } from '@/lib/sso/state'
import { loadSsoSession } from '@/lib/sso/session'
import type { SsoMembership } from '@/lib/sso/verify'

/**
 * 통합 세션(기획서 §3.7). 두 종류를 하나로:
 *  - SSO: 서명 쿠키 nm_sso → sso_session (SBworks 로 들어온 직원)
 *  - local: better-auth 세션 (로컬 관리자·협력업체 포털)
 * 우선순위: nm_sso 쿠키가 유효하면 SSO, 아니면 better-auth.
 */
export type AppSession = {
  userId: string
  name: string
  email: string
  role: 'admin' | 'partner' | 'staff'
  estRole: EstRole | null
  via: 'local' | 'sso'
  sso?: {
    sessionId: string
    tenant: { id: string; slug: string; name: string } | null
    roleName: string | null
    memberships: SsoMembership[]
    hq: boolean
  }
}

const asRole = (r: unknown): AppSession['role'] => (r === 'admin' ? 'admin' : r === 'staff' ? 'staff' : 'partner')

function cookieFromHeader(h: Headers, name: string): string | undefined {
  const raw = h.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return undefined
}

async function fromSsoCookie(value: string | undefined): Promise<AppSession | null> {
  const secret = ssoStateSecret()
  if (!secret || !value) return null
  const id = readSessionCookie(value, secret)
  if (!id) return null
  const s = await loadSsoSession(id).catch(() => null)
  if (!s) return null
  return {
    userId: s.userId,
    name: s.name,
    email: s.email,
    role: asRole(s.role),
    estRole: isEstRole(s.estRole) ? s.estRole : null,
    via: 'sso',
    sso: { sessionId: s.sessionId, tenant: s.tenant, roleName: s.roleName, memberships: s.memberships, hq: s.hq },
  }
}

async function fromLocal(user: { id: string; name: string; email: string; role?: unknown } | undefined | null): Promise<AppSession | null> {
  if (!user) return null
  const role = asRole(user.role)
  let estRole: EstRole | null = null
  if (role === 'admin') estRole = 'ceo' // 로컬 관리자 = 대표 권한(§8)
  else if (role === 'staff') {
    await ensureSso().catch(() => {})
    const { rows } = await pool.query(`SELECT est_role FROM "user" WHERE id = $1`, [user.id]).catch(() => ({ rows: [] as { est_role: string }[] }))
    estRole = isEstRole(rows[0]?.est_role) ? rows[0].est_role : null
  }
  return { userId: user.id, name: user.name, email: user.email, role, estRole, via: 'local' }
}

/** 서버 컴포넌트·서버 액션용 */
export async function getAppSession(): Promise<AppSession | null> {
  const sso = await fromSsoCookie((await cookies()).get(SESSION_COOKIE)?.value)
  if (sso) return sso
  const s = await getSession().catch(() => null)
  return fromLocal(s?.user as Parameters<typeof fromLocal>[0])
}

/** 요청 헤더로(proxy·API 라우트) */
export async function getAppSessionFrom(h: Headers): Promise<AppSession | null> {
  const sso = await fromSsoCookie(cookieFromHeader(h, SESSION_COOKIE))
  if (sso) return sso
  const s = await getSessionFrom(h)
  return fromLocal(s?.user as Parameters<typeof fromLocal>[0])
}

/** 관리자 화면에 들어올 수 있는지: 로컬 관리자 또는 견적 역할이 있는 SSO 직원 */
export function canEnterAdmin(s: AppSession | null | undefined): boolean {
  return !!s && (s.role === 'admin' || (s.via === 'sso' && s.estRole != null))
}

/** 기존 사이트·업체 관리 화면(관리자 전용)까지 쓸 수 있는지 */
export function isSiteAdmin(s: AppSession | null | undefined): boolean {
  return !!s && s.role === 'admin'
}

/** 견적 서버 액션 첫 줄. 역할이 모자라면 throw */
export async function requireEst(min: EstRole = 'writer'): Promise<AppSession & { estRole: EstRole }> {
  const s = await getAppSession()
  if (!s || !canEnterAdmin(s) || !atLeast(s.estRole, min)) throw new Error('Unauthorized')
  return s as AppSession & { estRole: EstRole }
}

/** 요청의 IP·UA (로그인 감사) */
export async function requestMeta(): Promise<{ ip: string | null; ua: string | null }> {
  const h = await headers()
  return { ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip'), ua: h.get('user-agent') }
}
