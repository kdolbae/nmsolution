-- 협력업체 포털: 계정 역할, 업체 코드, 업체 관계자 (2026-10-16)
-- 운영 DB 는 첫 조회 때 lib/auth-roles.ts · lib/portal/members.ts 가 같은 모양으로 만든다. 이 파일은 기록·수동 설치용.

-- 계정 역할: 관리자는 sbkim@nm-solution.co.kr 하나, 그 밖은 협력업체
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'partner';
UPDATE "user" SET role = 'admin', "emailVerified" = true WHERE lower(email) = 'sbkim@nm-solution.co.kr';

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_open boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS client_members (
  id          bigint generated always as identity primary key,
  client_id   bigint not null references clients(id) on delete cascade,
  user_id     text not null unique references "user"(id) on delete cascade,
  name        text not null,
  title       text,
  phone       text,
  status      text not null default 'pending',  -- pending | approved | suspended
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);
CREATE INDEX IF NOT EXISTS client_members_client_idx ON client_members (client_id);
