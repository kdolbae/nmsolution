-- (2026-10-24) 010_client_biz_number_link.sql 다음에 적용(011은 견적 자동화 PR이 씀). 배관 도면 작성(어드민 /admin/drawings)과 업체 페이지 보기 전용 도면.
-- 앱이 첫 조회 때 같은 것을 자동으로 만든다(lib/drawings/table.ts). 여러 번 실행해도 안전하다.
CREATE TABLE IF NOT EXISTS drawings (
  id             bigint generated always as identity primary key,
  title          text not null,
  client_id      bigint references clients(id) on delete set null,
  show_on_portal boolean not null default false,
  sort           int not null default 0,
  model          jsonb not null default '{}'::jsonb,
  rev            int not null default 1,
  summary        text,
  chat           jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     text
);
CREATE TABLE IF NOT EXISTS drawing_versions (
  id         bigint generated always as identity primary key,
  drawing_id bigint not null references drawings(id) on delete cascade,
  rev        int not null,
  model      jsonb not null,
  summary    text,
  created_by text,
  created_at timestamptz not null default now(),
  unique (drawing_id, rev)
);
