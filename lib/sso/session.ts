/**
 * SSO 세션표(sso_session)·1회용 jti(sso_nonce)·연결 계정(sso_identity). 기획서 §3.6~§3.9.
 * better-auth 세션은 그대로 두고(로컬 관리자·협력업체 포털), SSO 는 이 표 + 서명 쿠키 nm_sso 로 따로 둠.
 */
import { pool } from '@/lib/db'
import { ensureSso } from '@/lib/est/table'
import type { EstRole } from '@/lib/est/perm'
import { randomHex } from './crypto'
import type { SsoClaims, SsoMembership } from './verify'

/** jti 를 1회용으로 저장. 이미 있으면 false(replayed). 만료된 줄은 이때 지움 */
export async function consumeJti(jti: string, expSec: number): Promise<boolean> {
  await ensureSso()
  await pool.query(`DELETE FROM sso_nonce WHERE exp < now()`)
  const { rowCount } = await pool.query(`INSERT INTO sso_nonce (jti, exp) VALUES ($1, to_timestamp($2)) ON CONFLICT (jti) DO NOTHING`, [jti, expSec])
  return rowCount === 1
}

/**
 * SBworks 사용자 → 이 앱 user. sso_identity(sbworks_profile_id) → 같은 email 의 기존 user → 새 user
 * (role 'staff', 이메일 인증됨, account 줄 없음 = 비밀번호 없음). est_role 은 로그인마다 다시 매핑.
 */
export async function linkUser(c: SsoClaims, estRole: EstRole): Promise<string> {
  await ensureSso()
  const email = c.email.trim().toLowerCase()
  let userId: string | null = null
  const byIdentity = await pool.query<{ user_id: string }>(`SELECT user_id FROM sso_identity WHERE sbworks_profile_id = $1`, [c.sub])
  userId = byIdentity.rows[0]?.user_id ?? null
  if (!userId) {
    const byEmail = await pool.query<{ id: string }>(`SELECT id FROM "user" WHERE lower(email) = $1 LIMIT 1`, [email])
    userId = byEmail.rows[0]?.id ?? null
  }
  if (!userId) {
    userId = randomHex(16)
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role, est_role)
       VALUES ($1, $2, $3, true, now(), now(), 'staff', $4)`,
      [userId, c.name || email, email, estRole],
    )
  } else {
    await pool.query(`UPDATE "user" SET est_role = $2, name = COALESCE(NULLIF($3, ''), name), "updatedAt" = now() WHERE id = $1`, [userId, estRole, c.name])
  }
  const extra = { tenant: c.tenant, role: c.role, branch: c.branch, hq: c.hq, perms: c.perms.filter((p) => ['approval.decide', 'tenant.manage', 'hq.read'].includes(p)) }
  await pool.query(
    `INSERT INTO sso_identity (user_id, sbworks_profile_id, email, tenant_id, tenant_slug, role_code, scope, memberships, claims, last_login_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET sbworks_profile_id = EXCLUDED.sbworks_profile_id, email = EXCLUDED.email,
       tenant_id = EXCLUDED.tenant_id, tenant_slug = EXCLUDED.tenant_slug, role_code = EXCLUDED.role_code, scope = EXCLUDED.scope,
       memberships = EXCLUDED.memberships, claims = EXCLUDED.claims, last_login_at = now()`,
    [userId, c.sub, email, c.tenant.id, c.tenant.slug, c.role.code, c.scope, JSON.stringify(c.memberships ?? []), JSON.stringify(extra)],
  )
  return userId
}

export async function createSsoSession(userId: string, hours: number, ip: string | null, ua: string | null): Promise<{ id: string; expires: Date }> {
  await ensureSso()
  const id = randomHex(16)
  const h = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 30) : 12
  const { rows } = await pool.query<{ expires_at: Date }>(
    `INSERT INTO sso_session (id, user_id, expires_at, ip, ua) VALUES ($1, $2, now() + make_interval(secs => $3), $4, $5) RETURNING expires_at`,
    [id, userId, Math.round(h * 3600), ip?.slice(0, 100) ?? null, ua?.slice(0, 400) ?? null],
  )
  return { id, expires: new Date(rows[0].expires_at) }
}

export async function revokeSsoSession(id: string) {
  await ensureSso()
  await pool.query(`UPDATE sso_session SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [id])
}

export type SsoSessionRow = {
  sessionId: string
  userId: string
  name: string
  email: string
  role: string
  estRole: string | null
  tenant: { id: string; slug: string; name: string } | null
  roleName: string | null
  memberships: SsoMembership[]
  hq: boolean
  expiresAt: Date
}

/** 살아 있는 SSO 세션(폐기·만료 아님) */
export async function loadSsoSession(id: string): Promise<SsoSessionRow | null> {
  await ensureSso()
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.expires_at, u.name, u.email, u.role, u.est_role, i.memberships, i.claims
     FROM sso_session s JOIN "user" u ON u.id = s.user_id LEFT JOIN sso_identity i ON i.user_id = s.user_id
     WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [id],
  )
  const r = rows[0]
  if (!r) return null
  const claims = (r.claims ?? {}) as { tenant?: SsoSessionRow['tenant']; role?: { name?: string }; hq?: boolean }
  return {
    sessionId: r.id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    role: r.role,
    estRole: r.est_role,
    tenant: claims.tenant ?? null,
    roleName: claims.role?.name ?? null,
    memberships: Array.isArray(r.memberships) ? r.memberships : [],
    hq: claims.hq === true,
    expiresAt: new Date(r.expires_at),
  }
}
