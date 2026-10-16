-- (2026-10-16) 009_client_portal.sql 다음에 적용. 업체용 링크(portal_slug 등)는 협력업체 포털(업체 관계자 계정)과 별개로 업체 하나에 아이디·비밀번호 하나를 두는 방식.
-- 업체 사업자등록번호(견적서 수신란에 인쇄)와 코드로 넣은 업체 기록. 앱이 첫 조회 때 같은 것을 자동으로 만든다(lib/clients/table.ts).
-- 여러 번 실행해도 안전하다.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS biz_number text;
CREATE TABLE IF NOT EXISTS client_seeds (
  key        text primary key,
  created_at timestamptz not null default now()
);

-- 업체용 링크 (nm-solution.co.kr/<portal_slug>). 비밀번호는 scrypt 해시만 둔다.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_slug text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_login text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_password_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS clients_portal_slug_key ON clients (portal_slug) WHERE portal_slug IS NOT NULL;
