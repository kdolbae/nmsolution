import { pool } from '@/lib/db'

/**
 * 계정 역할: 'admin'(엔엠솔루션 관리자) | 'partner'(협력업체 관계자) | 'staff'(SBworks 로 들어온 직원, 비밀번호 없음 — lib/sso).
 * 견적 시스템 역할(writer·reviewer·ceo)은 user.est_role 칸에 따로 둔다(sql/015_sso.sql).
 * user 표에 role 칸이 없으면 만든다. 처음 만들 때 ADMIN_EMAIL 계정을 관리자로, 이메일 인증된 것으로 둔다.
 * (그 주소의 계정이 없으면 그때까지 있던 계정 — 관리자 1명뿐이었다 — 을 관리자로 둬서 잠기지 않게 한다.)
 * 이후 새 계정의 기본값은 'partner' 다.
 * Better Auth 가 role 칸을 읽으므로, 세션을 확인하는 모든 곳보다 먼저 한 번 돈다(lib/admin.ts, app/api/auth).
 */
export type Role = 'admin' | 'partner' | 'staff'

/** 관리자 계정 이메일. 이 주소로만 관리자 계정을 만들 수 있다 (kevin 2026-10-16) */
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'sbkim@nm-solution.co.kr').trim().toLowerCase()

export function isAdminEmail(email: string | null | undefined): boolean {
  return String(email ?? '').trim().toLowerCase() === ADMIN_EMAIL
}

const sqlText = (s: string) => `'${s.replace(/'/g, "''")}'`

let ready: Promise<void> | null = null

export function ensureUserRole(): Promise<void> {
  if (!ready) {
    ready = pool
      .query(
        `DO $$ BEGIN
           PERFORM pg_advisory_xact_lock(778201);
           IF to_regclass('"user"') IS NOT NULL AND NOT EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'user' AND column_name = 'role'
           ) THEN
             ALTER TABLE "user" ADD COLUMN role text NOT NULL DEFAULT 'partner';
             UPDATE "user" SET role = 'admin', "emailVerified" = true WHERE lower(email) = ${sqlText(ADMIN_EMAIL)};
             IF NOT FOUND THEN
               UPDATE "user" SET role = 'admin', "emailVerified" = true;
             END IF;
           END IF;
         END $$;`,
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}

export function isAdmin(user: { role?: unknown } | null | undefined): boolean {
  return user?.role === 'admin'
}

export async function adminCount(): Promise<number> {
  await ensureUserRole()
  const { rows } = await pool.query(`SELECT count(*)::int AS count FROM "user" WHERE role = 'admin'`)
  return rows[0]?.count ?? 0
}
