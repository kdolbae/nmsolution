-- 015_sso: 견적·원가·이익 시스템 (기획서 v1 §4). 이 파일은 scripts/est-sql.ts 가 lib/est/ddl.ts·seed.ts 로 만듦 — 고치려면 그 파일을 고치고 pnpm est:sql.
-- 실행: search_path=nmsolution(sql/README.md B안) 또는 전용 DB. 여러 번 실행해도 안전. 앱도 첫 조회 때 같은 SQL 을 돌림(lib/est/table.ts).
-- 견적 시스템: SBworks SSO 수신(세션·1회용 jti·연결 계정)
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
-- 기존 role 값 'admin' | 'partner' 에 'staff'(SBworks 로 들어온 직원) 추가. 값 검사는 앱(lib/auth-roles.ts Role 타입)이 함
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS est_role text CHECK (est_role IN ('writer','reviewer','ceo'));
UPDATE "user" SET est_role = 'ceo' WHERE role = 'admin' AND est_role IS NULL;  -- 로컬 관리자 = 대표 권한

CREATE TABLE IF NOT EXISTS sso_identity (
  user_id              text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  sbworks_profile_id   uuid NOT NULL UNIQUE,
  email                text NOT NULL,
  tenant_id            uuid NOT NULL,
  tenant_slug          text NOT NULL,
  role_code            text NOT NULL,
  scope                text NOT NULL,
  memberships          jsonb NOT NULL DEFAULT '[]',
  last_login_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sso_identity ADD COLUMN IF NOT EXISTS claims jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS sso_session (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  ip          text, ua text
);
CREATE INDEX IF NOT EXISTS sso_session_user_idx ON sso_session (user_id, expires_at DESC);
CREATE TABLE IF NOT EXISTS sso_nonce (
  jti     text PRIMARY KEY,
  exp     timestamptz NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);
