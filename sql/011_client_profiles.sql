-- (2026-10-20) 010_client_biz_number_link.sql 다음에 적용. 앱이 첫 조회 때 같은 것을 자동으로 만든다
-- (lib/clients/cards.ts, lib/clients/profile.ts, lib/clients/schedule.ts). 여러 번 실행해도 안전하다.

-- 업체 명함 (여러 장). 넣을 때마다 Claude 가 읽어 담당자·직함을 contact 에 저장한다. 개인정보라 DB 에만 둔다
CREATE TABLE IF NOT EXISTS client_cards (
  id         bigint generated always as identity primary key,
  client_id  bigint not null references clients(id) on delete cascade,
  status     text not null default 'reading',
  error      text,
  card_text  text,
  image      bytea,
  mime       text,
  contact    jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS client_cards_client_idx ON client_cards (client_id);

-- 업체 프로필 (내부자료: 주업종·주 고객사·재무상태 등, 출처 포함). 업체용 링크·포털·인쇄에서 읽지 않는다
CREATE TABLE IF NOT EXISTS client_profiles (
  client_id   bigint primary key references clients(id) on delete cascade,
  status      text not null default 'idle',
  error       text,
  hint        text,
  profile     jsonb,
  model       text,
  started_at  timestamptz,
  finished_at timestamptz,
  updated_at  timestamptz not null default now()
);

-- 상세 공정 (어드민·SBworks 공용)과 고친 기록
CREATE TABLE IF NOT EXISTS client_schedules (
  client_id  bigint primary key references clients(id) on delete cascade,
  steps      jsonb not null default '[]'::jsonb,
  revision   int not null default 0,
  updated_by text,
  source     text,
  updated_at timestamptz not null default now()
);
CREATE TABLE IF NOT EXISTS client_schedule_log (
  id         bigint generated always as identity primary key,
  client_id  bigint not null references clients(id) on delete cascade,
  revision   int not null,
  steps      jsonb not null,
  summary    text,
  created_by text,
  source     text,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS client_schedule_log_client_idx ON client_schedule_log (client_id, revision);
