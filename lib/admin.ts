import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { adminCount, ensureUserRole, isAdmin } from '@/lib/auth-roles'
import { headers } from 'next/headers'

export { isAdmin }

/** 로그인한 계정(관리자·협력업체 모두). 역할은 session.user.role */
export async function getSession() {
  await ensureUserRole()
  return auth.api.getSession({ headers: await headers() })
}

/** 요청 헤더로 세션 확인 (API 라우트·proxy) */
export async function getSessionFrom(h: Headers) {
  await ensureUserRole()
  return auth.api.getSession({ headers: h }).catch(() => null)
}

/** 관리자 세션. 협력업체 계정이거나 로그인 안 했으면 null */
export async function getAdminSession() {
  const session = await getSession()
  return session?.user && isAdmin(session.user) ? session : null
}

/** 관리자만 쓰는 서버 액션 첫 줄 */
export async function requireAdmin() {
  const session = await getAdminSession()
  if (!session) throw new Error('Unauthorized')
  return session.user
}

/** 관리자 계정이 아직 없는지 (최초 설정 필요) */
export async function needsSetup() {
  return (await adminCount()) === 0
}

/** 관리자들의 이메일 (가입 승인 요청 알림용) */
export async function adminEmails(): Promise<string[]> {
  await ensureUserRole()
  const { rows } = await pool.query<{ email: string }>(`SELECT email FROM "user" WHERE role = 'admin'`)
  return rows.map((r) => r.email)
}
