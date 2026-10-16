-- 업체 사업자등록번호(견적서 수신란에 인쇄)와 코드로 넣은 업체 기록. 앱이 첫 조회 때 같은 것을 자동으로 만든다(lib/clients/table.ts).
-- 여러 번 실행해도 안전하다.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS biz_number text;
CREATE TABLE IF NOT EXISTS client_seeds (
  key        text primary key,
  created_at timestamptz not null default now()
);
