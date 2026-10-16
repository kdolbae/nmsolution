-- 공정 진행 공유: 공정표 · 일일 현장 보고 · 현장 사진 (lib/portal/progress.ts 가 첫 조회 때 같은 모양으로 만든다)
CREATE TABLE IF NOT EXISTS project_tasks (
  id          bigint generated always as identity primary key,
  client_id   bigint not null references clients(id) on delete cascade,
  name        text not null,
  crew        text not null default '',
  start_date  date not null,
  end_date    date not null,
  progress    int not null default 0 check (progress between 0 and 100),
  sort        int not null default 0,
  memo        text not null default '',
  done_at     timestamptz,
  updated_at  timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS project_tasks_client_idx ON project_tasks (client_id, sort, start_date);

CREATE TABLE IF NOT EXISTS daily_reports (
  id           bigint generated always as identity primary key,
  client_id    bigint not null references clients(id) on delete cascade,
  report_date  date not null,
  weather      text not null default '',
  crew         text not null default '',
  work_done    text not null default '',
  plan_next    text not null default '',
  issues       text not null default '',
  summary      text not null default '',
  task_updates jsonb not null default '[]',
  published    boolean not null default false,
  published_at timestamptz,
  notified_at  timestamptz,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (client_id, report_date)
);

CREATE TABLE IF NOT EXISTS report_photos (
  id         bigint generated always as identity primary key,
  report_id  bigint not null references daily_reports(id) on delete cascade,
  task_id    bigint references project_tasks(id) on delete set null,
  caption    text not null default '',
  mime       text not null,
  bytes      int not null,
  data       bytea not null,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS report_photos_report_idx ON report_photos (report_id, sort, id);
