-- 한 업체에 견적서 여러 개 (본 견적 + 추가 공정 견적, kevin 2026-10-28).
-- 추가 견적서는 clients 한 줄로 두고 parent_id 로 본 견적(업체)에 붙인다. 견적서·제안서·버전 기록·최종본 확정은 견적서마다 따로.
-- 앱이 첫 조회 때 같은 열을 자동으로 만든다(lib/clients/table.ts). 여러 번 실행해도 안전하다.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES clients(id) ON DELETE CASCADE,  -- 추가 견적서면 본 견적 id
  ADD COLUMN IF NOT EXISTS quote_label text;                                          -- 견적서 이름 (예: 추가 공정 - 배관 보온)
CREATE INDEX IF NOT EXISTS clients_parent_idx ON clients (parent_id) WHERE parent_id IS NOT NULL;
