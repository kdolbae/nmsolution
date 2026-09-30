-- 방문·유입·문의 기록 (마케팅 상황판 /admin/stats 의 원장). 나노마스터 site_events 와 같은 방식.
-- 사이트(lib/site-events.ts)가 페이지를 열 때·떠날 때·전화/카톡/견적 버튼을 누를 때 /api/track 으로 한 줄씩 남긴다.
-- 이름·연락처는 담지 않는다. 여러 번 실행해도 안전하다.
-- 공유 DB(B 방식)에서는 nmsolution 스키마에 만든다. 앱(lib/site-events-table.ts)도 표가 없으면 스스로 만든다.
create table if not exists nmsolution.site_events (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  type         text not null check (type in ('pageview','leave','call','kakao','form')),
  label        text,
  path         text,
  referrer     text,
  source       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  ad_query     text,
  ad_rank      integer,
  session_id   text,
  visitor_id   text,
  seconds      integer,
  scroll       integer,
  ua           text
);
create index if not exists site_events_created_idx on nmsolution.site_events (created_at desc);
create index if not exists site_events_visitor_idx on nmsolution.site_events (visitor_id);
alter table nmsolution.site_events enable row level security;
grant select, insert on nmsolution.site_events to nmsolution_app;
grant usage, select on all sequences in schema nmsolution to nmsolution_app;
