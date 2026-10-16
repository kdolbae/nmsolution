-- 012_est_project: 견적·원가·이익 시스템 (기획서 v1 §4). 이 파일은 scripts/est-sql.ts 가 lib/est/ddl.ts·seed.ts 로 만듦 — 고치려면 그 파일을 고치고 pnpm est:sql.
-- 실행: search_path=nmsolution(sql/README.md B안) 또는 전용 DB. 여러 번 실행해도 안전. 앱도 첫 조회 때 같은 SQL 을 돌림(lib/est/table.ts).
-- 견적 시스템: 프로젝트 DB (clients = sql/007, quote_requests = sql/001, "user" = 인증 표)
CREATE TABLE IF NOT EXISTS est_project (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  number           text NOT NULL UNIQUE,
  title            text NOT NULL,
  client_id        bigint REFERENCES clients(id),
  client_type      text NOT NULL DEFAULT 'company' CHECK (client_type IN ('company','public','insurer','individual','gc','other')),
  site_address     text NOT NULL DEFAULT '',
  inquiry_text     text NOT NULL DEFAULT '',
  quote_request_id int REFERENCES quote_requests(id),
  class1_id        bigint REFERENCES est_class(id),
  class2_id        bigint REFERENCES est_class(id),
  stage            text NOT NULL DEFAULT 'P1' CHECK (stage IN ('P1','P2','P3','P5','P6','WON','EXEC','SETTLE','CLOSED','LOST','HOLD')),
  result           text CHECK (result IN ('won','lost','hold')),
  result_reason    text,
  result_at        timestamptz,
  site_summary     text NOT NULL DEFAULT '',
  manager_visits_planned int NOT NULL DEFAULT 0,
  current_estimate_id bigint,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE INDEX IF NOT EXISTS est_project_stage_idx ON est_project (stage, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS est_project_client_idx ON est_project (client_id);

-- 월별 순번 (yymm = KST)
CREATE TABLE IF NOT EXISTS est_project_seq (yymm text PRIMARY KEY, last int NOT NULL DEFAULT 0);

-- 사람: 담당자(manager) 1명 이상 필수(결재 올릴 때 검사), 작성자(writer), 결재자(approver)
CREATE TABLE IF NOT EXISTS est_project_member (
  project_id  bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id),
  role        text NOT NULL CHECK (role IN ('manager','writer','approver','viewer')),
  is_primary  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (project_id, user_id, role)
);

-- 체크리스트 답. confirm_needed = 현장에서 못 확인 → 고객 서류에 "협의 후 확정"
CREATE TABLE IF NOT EXISTS est_check_answer (
  project_id      bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  question_id     bigint NOT NULL REFERENCES est_check_question(id),
  value           jsonb,
  note            text,
  confirm_needed  boolean NOT NULL DEFAULT false,
  answered_by     text,
  answered_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, question_id)
);

-- 방문 기록(담당자 비용·실투입 근거)
CREATE TABLE IF NOT EXISTS est_visit (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id),
  visited_on  date NOT NULL DEFAULT current_date,
  purpose     text NOT NULL DEFAULT 'survey' CHECK (purpose IN ('survey','meeting','supervise','handover','other')),
  hours       numeric(4,1),
  note        text,
  counts_as_manager_day boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS est_visit_project_idx ON est_visit (project_id, visited_on);

-- 사진. 파일은 lib/quote-photos.ts 처럼 DB(bytea)에 두고 path = 'db' (외부 스토리지로 옮기면 그 경로)
CREATE TABLE IF NOT EXISTS est_photo (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  visit_id    bigint REFERENCES est_visit(id) ON DELETE SET NULL,
  question_id bigint REFERENCES est_check_question(id),
  path        text NOT NULL,
  caption     text NOT NULL DEFAULT '',
  for_customer boolean NOT NULL DEFAULT false,
  taken_at    timestamptz,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE est_photo ADD COLUMN IF NOT EXISTS mime text, ADD COLUMN IF NOT EXISTS data bytea;
CREATE INDEX IF NOT EXISTS est_photo_project_idx ON est_photo (project_id);

-- 변수·돌발 기록(견적 외 상황). 정산 때 원가 차이 설명·마스터 보완 근거
CREATE TABLE IF NOT EXISTS est_event (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('site','client','weather','safety','design','other')),
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  cost_impact bigint NOT NULL DEFAULT 0,
  occurred_on date NOT NULL DEFAULT current_date,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
