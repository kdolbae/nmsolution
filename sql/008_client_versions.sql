-- 업체 관리 버전 기록과 최종본 잠금. 관리자 → 업체 관리 → 업체 → 버전 기록.
-- 앱이 첫 조회 때 같은 표·열을 자동으로 만들고(lib/clients/table.ts), 버전이 없는 업체는 지금 상태를 v1 로 남긴다.
-- 이 파일은 직접 만들어 두고 싶을 때만 실행한다. 여러 번 실행해도 안전하다.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS finalized_version int,          -- 최종본으로 확정한 버전 번호
  ADD COLUMN IF NOT EXISTS finalized_at      timestamptz,  -- 확정 시각. 값이 있으면 제안서·견적서를 고칠 수 없다
  ADD COLUMN IF NOT EXISTS finalized_by      text;

CREATE TABLE IF NOT EXISTS client_versions (
  id            bigint generated always as identity primary key,
  client_id     bigint not null references clients(id) on delete cascade,
  version_no    int not null,
  change        text not null,  -- init | proposal | quote | system
  summary       text,           -- 버전 기록에 보이는 한 줄
  proposal_html text,           -- 그 버전의 제안서 전체
  quote         jsonb,          -- 그 버전의 견적서 전체
  created_by    text,
  created_at    timestamptz not null default now(),
  unique (client_id, version_no)
);
