/**
 * 견적 시스템 표 정의(sql/011~015) — 정본은 sql 파일이고, 이 파일의 문자열과 sql 파일은
 * scripts/est-sql.ts 로 같은 내용을 씀(테스트가 둘이 같은지 확인). 운영 DB 는 첫 조회 때
 * lib/est/table.ts ensureEst() 가 이 문자열을 돌림(lib/clients/table.ts 와 같은 방식).
 *
 * 규약: 스키마 접두 없이 쓰고 search_path=nmsolution 으로 실행(sql/README.md B안). 모두 여러 번 실행해도 안전.
 * 금액 bigint(원), 비율 numeric(6,3)(%), 수량 numeric(12,3).
 */

export const SQL_011 = `-- 견적 시스템: 설정·분류·체크리스트 질문·품목·단가·요율·템플릿·규칙
CREATE TABLE IF NOT EXISTS est_setting (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  label       text NOT NULL,
  "group"     text NOT NULL,
  help        text,
  is_sample   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

-- 분류 4단계: 1 대분류(사업) > 2 소분류(작업 유형) > 3 공정(공종) > 4 세부 시공
CREATE TABLE IF NOT EXISTS est_class (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level       smallint NOT NULL CHECK (level BETWEEN 1 AND 4),
  parent_id   bigint REFERENCES est_class(id),
  code        text NOT NULL,
  name        text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  meta        jsonb NOT NULL DEFAULT '{}',
  UNIQUE (code),
  CHECK ((level = 1) = (parent_id IS NULL))
);
CREATE INDEX IF NOT EXISTS est_class_parent_idx ON est_class (parent_id, sort_order);

-- 현장 확인 체크리스트 질문. class2_id NULL = 모든 작업 유형 공통
CREATE TABLE IF NOT EXISTS est_check_question (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  class2_id    bigint REFERENCES est_class(id),
  label        text NOT NULL,
  answer_type  text NOT NULL CHECK (answer_type IN ('bool','number','select','multi','text','photo')),
  options      jsonb NOT NULL DEFAULT '[]',
  unit         text,
  required     boolean NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true
);

-- 품목 마스터. code 는 견적 산출 DB·실제 지출 DB 가 함께 쓰는 열쇠
-- qty_rule_type: fixed {qty} · area_factor {question,factor,round} · people_days {people_q|people, days_q|days}
--                rule {rule_code} · answer {question} · answer_mul {question,factor} · visits(담당자 방문 수)
CREATE TABLE IF NOT EXISTS est_item (
  code           text PRIMARY KEY,
  kind           text NOT NULL CHECK (kind IN ('자재','용역','장비','노무','경비')),
  name           text NOT NULL,
  spec           text NOT NULL DEFAULT '',
  unit           text NOT NULL DEFAULT '식',
  class3_id      bigint REFERENCES est_class(id),
  qty_rule_type  text NOT NULL DEFAULT 'fixed' CHECK (qty_rule_type IN ('fixed','area_factor','people_days','rule','answer','answer_mul','visits')),
  qty_rule       jsonb NOT NULL DEFAULT '{}',
  basis_text     text NOT NULL DEFAULT '',
  internal_memo  text NOT NULL DEFAULT '',
  labor_class    text CHECK (labor_class IN ('our_staff','daily','partner')),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 견적 단가 이력. 지금 단가 = effective_from <= 오늘 중 가장 늦은 줄
CREATE TABLE IF NOT EXISTS est_item_price (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_code      text NOT NULL REFERENCES est_item(code) ON DELETE CASCADE,
  price          bigint NOT NULL CHECK (price >= 0),
  effective_from date NOT NULL DEFAULT current_date,
  note           text,
  source         text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import','variance')),
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS est_item_price_cur_idx ON est_item_price (item_code, effective_from DESC);

-- 요율 세트. mode full = 건설 원가계산, simple = 누수·보험사용(공과잡비+이윤)
CREATE TABLE IF NOT EXISTS est_rate_set (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code                 text NOT NULL UNIQUE,
  name                 text NOT NULL,
  mode                 text NOT NULL CHECK (mode IN ('full','simple')),
  rates                jsonb NOT NULL,
  truncate_unit        int NOT NULL DEFAULT 1000,
  expense_per_crew_day bigint NOT NULL DEFAULT 50000,
  is_active            boolean NOT NULL DEFAULT true,
  is_sample            boolean NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 작업 유형(소분류) 템플릿
CREATE TABLE IF NOT EXISTS est_template (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class2_id   bigint NOT NULL REFERENCES est_class(id),
  name        text NOT NULL,
  version     int NOT NULL DEFAULT 1,
  rate_set_id bigint REFERENCES est_rate_set(id),
  is_active   boolean NOT NULL DEFAULT true,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class2_id, version)
);
-- condition: 조건부 항목 조건 {"question":"hot_work","op":"eq","value":true} (op: eq, ne, gt, gte, lt, lte, in, truthy / all·any 묶음)
-- remove_if: 기본 항목 자동 삭제 제안 {"question":"client_provides_crane","op":"truthy","reason":"client_provides"}
CREATE TABLE IF NOT EXISTS est_template_item (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id   bigint NOT NULL REFERENCES est_template(id) ON DELETE CASCADE,
  class3_id     bigint REFERENCES est_class(id),
  item_code     text NOT NULL REFERENCES est_item(code),
  grade         text NOT NULL CHECK (grade IN ('required','basic','conditional')),
  condition     jsonb,
  remove_if     jsonb,
  qty_rule_type text,
  qty_rule      jsonb,
  sort_order    int NOT NULL DEFAULT 0,
  UNIQUE (template_id, item_code)
);
ALTER TABLE est_template_item ADD COLUMN IF NOT EXISTS remove_if jsonb;

-- 규칙표: 체크리스트 답 → 항목 추가·수량. class1_id NULL = 전 사업 공통
-- action.qty.type: answer · answer_mul{question,factor} · people_times_answer{people,question} · fixed{qty}
CREATE TABLE IF NOT EXISTS est_rule (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        text NOT NULL UNIQUE,
  class1_id   bigint REFERENCES est_class(id),
  name        text NOT NULL,
  condition   jsonb NOT NULL,
  action      jsonb NOT NULL,
  message     text,
  severity    text NOT NULL DEFAULT 'error' CHECK (severity IN ('error','warn')),
  is_active   boolean NOT NULL DEFAULT true,
  is_sample   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0
);
`

export const SQL_012 = `-- 견적 시스템: 프로젝트 DB (clients = sql/007, quote_requests = sql/001, "user" = 인증 표)
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
`

export const SQL_013 = `-- 견적 시스템: 판·공정·줄·토의·검사·결재·제출·대장
CREATE TABLE IF NOT EXISTS est_estimate (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id         bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  version_no         int NOT NULL,
  label              text NOT NULL DEFAULT '',
  parent_id          bigint REFERENCES est_estimate(id),
  status             text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','discussion','checking','approving','approved','rejected','submitted','superseded','void')),
  template_id        bigint REFERENCES est_template(id),
  rate_set_id        bigint REFERENCES est_rate_set(id),
  rates_snapshot     jsonb NOT NULL,
  settings_snapshot  jsonb NOT NULL DEFAULT '{}',
  manager_visits     int NOT NULL DEFAULT 0,
  -- 목록용 합계(계산은 lib/est/calc.ts 가 정본, 저장할 때 다시 계산해 덮어씀)
  supply             bigint NOT NULL DEFAULT 0,
  vat                bigint NOT NULL DEFAULT 0,
  total              bigint NOT NULL DEFAULT 0,
  cost_min           bigint NOT NULL DEFAULT 0,
  cost_typ           bigint NOT NULL DEFAULT 0,
  cost_max           bigint NOT NULL DEFAULT 0,
  expected_profit    bigint NOT NULL DEFAULT 0,
  margin_pct         numeric(6,2) NOT NULL DEFAULT 0,
  incentive_expected bigint NOT NULL DEFAULT 0,
  check_passed       boolean,
  approval_status    text CHECK (approval_status IN ('pending','approved','rejected')),
  approved_at        timestamptz,
  submitted_at       timestamptz,
  valid_until        date,
  customer_number    text,
  notes_customer     text NOT NULL DEFAULT '',
  created_by         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_no)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'est_project_current_estimate_fk' AND conrelid = 'est_project'::regclass) THEN
    ALTER TABLE est_project ADD CONSTRAINT est_project_current_estimate_fk FOREIGN KEY (current_estimate_id) REFERENCES est_estimate(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS est_section (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id  bigint NOT NULL REFERENCES est_estimate(id) ON DELETE CASCADE,
  class3_id    bigint REFERENCES est_class(id),
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  calc_mode    text NOT NULL DEFAULT 'full' CHECK (calc_mode IN ('full','margin','overhead','none')),
  is_option    boolean NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS est_section_estimate_idx ON est_section (estimate_id, sort_order);

CREATE TABLE IF NOT EXISTS est_line (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id    bigint NOT NULL REFERENCES est_estimate(id) ON DELETE CASCADE,
  section_id     bigint NOT NULL REFERENCES est_section(id) ON DELETE CASCADE,
  item_code      text REFERENCES est_item(code),
  kind           text NOT NULL CHECK (kind IN ('자재','용역','장비','노무','경비')),
  name           text NOT NULL,
  spec           text NOT NULL DEFAULT '',
  unit           text NOT NULL DEFAULT '식',
  qty            numeric(12,3) NOT NULL DEFAULT 0,
  unit_price     bigint NOT NULL DEFAULT 0,
  amount         bigint NOT NULL DEFAULT 0,
  grade          text NOT NULL DEFAULT 'basic' CHECK (grade IN ('required','basic','conditional','rule','manual','manager')),
  origin         text NOT NULL DEFAULT 'manual' CHECK (origin IN ('template','rule','manual','manager')),
  qty_rule_snapshot jsonb,
  qty_overridden boolean NOT NULL DEFAULT false,
  basis_text     text NOT NULL DEFAULT '',
  internal_memo  text NOT NULL DEFAULT '',
  confirm_needed boolean NOT NULL DEFAULT false,
  removed        boolean NOT NULL DEFAULT false,
  removed_reason text CHECK (removed_reason IN ('not_applicable','client_provides','separate_contract','other')),
  removed_note   text,
  actual_min     bigint, actual_typ bigint, actual_max bigint, actual_source text,
  crew_days      numeric(10,2),
  sort_order     int NOT NULL DEFAULT 0,
  CHECK (NOT removed OR removed_reason IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS est_line_estimate_idx ON est_line (estimate_id, section_id, sort_order);

CREATE TABLE IF NOT EXISTS est_comment (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id  bigint NOT NULL REFERENCES est_estimate(id) ON DELETE CASCADE,
  line_id      bigint REFERENCES est_line(id) ON DELETE SET NULL,
  user_id      text NOT NULL REFERENCES "user"(id),
  body         text NOT NULL,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS est_check_run (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id  bigint NOT NULL REFERENCES est_estimate(id) ON DELETE CASCADE,
  results      jsonb NOT NULL,
  passed       boolean NOT NULL,
  ran_by       text,
  ran_at       timestamptz NOT NULL DEFAULT now()
);

-- 결재 단계. round = 올린 차수(반려 후 다시 올리면 다음 차수, 앞 차수 기록은 남음)
CREATE TABLE IF NOT EXISTS est_approval (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id  bigint NOT NULL REFERENCES est_estimate(id) ON DELETE CASCADE,
  round        int NOT NULL DEFAULT 1,
  step_no      smallint NOT NULL,
  step_role    text NOT NULL CHECK (step_role IN ('writer','reviewer','ceo')),
  approver_id  text REFERENCES "user"(id),
  status       text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','pending','approved','rejected','skipped')),
  comment      text,
  decided_by   text REFERENCES "user"(id),
  decided_at   timestamptz,
  UNIQUE (estimate_id, round, step_no)
);

-- 제출 기록(견적 대장의 원천)
CREATE TABLE IF NOT EXISTS est_submission (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id   bigint NOT NULL REFERENCES est_estimate(id),
  submitted_by  text REFERENCES "user"(id),
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  channel       text NOT NULL DEFAULT 'print' CHECK (channel IN ('print','pdf','email','kakao','portal','other')),
  recipient     text,
  valid_until   date NOT NULL,
  pdf_path      text,
  note          text
);

CREATE OR REPLACE VIEW est_ledger AS
SELECT s.id AS submission_id, p.id AS project_id, p.number, p.title, c.name AS client_name,
       e.id AS estimate_id, e.version_no, e.label, e.customer_number, e.supply, e.vat, e.total,
       s.submitted_at, s.valid_until, s.channel, p.result, p.result_at, p.stage
FROM est_submission s
JOIN est_estimate e ON e.id = s.estimate_id
JOIN est_project p ON p.id = e.project_id
LEFT JOIN clients c ON c.id = p.client_id
WHERE p.deleted_at IS NULL;
`

export const SQL_014 = `-- 견적 시스템: 실제 지출 DB·실행·정산
-- 노무 인·일 실단가(우리 직원·일용·협력사). 연장·야간 배수
CREATE TABLE IF NOT EXISTS est_labor_rate (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  labor_class     text NOT NULL CHECK (labor_class IN ('our_staff','daily','partner')),
  item_code       text REFERENCES est_item(code),
  day_rate        bigint NOT NULL,
  overtime_factor numeric(4,2) NOT NULL DEFAULT 1.5,
  night_factor    numeric(4,2) NOT NULL DEFAULT 1.5,
  effective_from  date NOT NULL DEFAULT current_date,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS est_labor_rate_idx ON est_labor_rate (item_code, labor_class, effective_from DESC);

-- 실단가 관측(구매·임차·외주 견적/계약·경비 실지출). 정산 마감 때 발주에서 자동으로도 쌓임
CREATE TABLE IF NOT EXISTS est_actual_cost (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_code    text NOT NULL REFERENCES est_item(code),
  source       text NOT NULL CHECK (source IN ('purchase','rental','subcontract_quote','subcontract_contract','labor','expense','manual')),
  unit_price   bigint NOT NULL,
  vendor       text,
  project_id   bigint REFERENCES est_project(id) ON DELETE SET NULL,
  observed_on  date NOT NULL DEFAULT current_date,
  note         text,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS est_actual_cost_idx ON est_actual_cost (item_code, observed_on DESC);

-- 품목별 실단가 통계(최근 N건은 앱이 설정 actual.window_count 로 자름; 뷰는 전체·최근값)
CREATE OR REPLACE VIEW est_actual_stat AS
SELECT item_code,
       min(unit_price) AS min_price, max(unit_price) AS max_price,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY unit_price)::bigint AS median_price,
       (array_agg(unit_price ORDER BY observed_on DESC, id DESC))[1] AS last_price,
       count(*) AS n, max(observed_on) AS last_on
FROM est_actual_cost GROUP BY item_code;

-- 발주(실행). planned = 예상원가(typ) 스냅샷, ordered = 발주/절충 금액
CREATE TABLE IF NOT EXISTS est_order (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id      bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  estimate_id     bigint REFERENCES est_estimate(id),
  line_id         bigint REFERENCES est_line(id) ON DELETE SET NULL,
  item_code       text REFERENCES est_item(code),
  kind            text NOT NULL CHECK (kind IN ('자재','용역','장비','노무','경비')),
  name            text NOT NULL,
  vendor          text,
  qty             numeric(12,3) NOT NULL DEFAULT 1,
  planned_amount  bigint NOT NULL DEFAULT 0,
  ordered_amount  bigint NOT NULL DEFAULT 0,
  negotiation_note text,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ordered','done','canceled')),
  ordered_on      date,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS est_order_project_idx ON est_order (project_id);

-- 실지출
CREATE TABLE IF NOT EXISTS est_payment (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  order_id    bigint REFERENCES est_order(id) ON DELETE SET NULL,
  item_code   text REFERENCES est_item(code),
  kind        text NOT NULL CHECK (kind IN ('자재','용역','장비','노무','경비','담당자','인센티브')),
  amount      bigint NOT NULL,
  paid_on     date NOT NULL DEFAULT current_date,
  vendor      text,
  evidence_path text,
  note        text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS est_payment_project_idx ON est_payment (project_id, paid_on);

-- 실수금
CREATE TABLE IF NOT EXISTS est_receipt (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('advance','interim','balance','extra','refund')),
  amount      bigint NOT NULL,
  received_on date NOT NULL DEFAULT current_date,
  note        text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 실투입 인·일 (견적 작업 기준과 비교)
CREATE TABLE IF NOT EXISTS est_crew_day (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id     bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  work_date      date NOT NULL,
  item_code      text REFERENCES est_item(code),
  labor_class    text NOT NULL CHECK (labor_class IN ('our_staff','daily','partner')),
  headcount      numeric(5,1) NOT NULL,
  hours          numeric(4,1) NOT NULL DEFAULT 8,
  overtime_hours numeric(4,1) NOT NULL DEFAULT 0,
  night          boolean NOT NULL DEFAULT false,
  note           text,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 정산(프로젝트당 1줄)
CREATE TABLE IF NOT EXISTS est_settlement (
  project_id        bigint PRIMARY KEY REFERENCES est_project(id) ON DELETE CASCADE,
  estimate_id       bigint REFERENCES est_estimate(id),
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  final_supply      bigint NOT NULL DEFAULT 0,
  received_total    bigint NOT NULL DEFAULT 0,
  paid_total        bigint NOT NULL DEFAULT 0,
  manager_days      numeric(6,1) NOT NULL DEFAULT 0,
  manager_cost      bigint NOT NULL DEFAULT 0,
  incentive_basis   jsonb NOT NULL DEFAULT '{}',
  incentive_amount  bigint NOT NULL DEFAULT 0,
  exec_profit       bigint NOT NULL DEFAULT 0,
  negotiation_gain  bigint NOT NULL DEFAULT 0,
  final_profit      bigint NOT NULL DEFAULT 0,
  closed_by         text, closed_at timestamptz,
  note              text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE est_settlement ADD COLUMN IF NOT EXISTS manager_days_overridden boolean NOT NULL DEFAULT false;

-- 견적단가 vs 실단가 차이 → 마스터 갱신 후보
CREATE TABLE IF NOT EXISTS est_variance_flag (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id      bigint NOT NULL REFERENCES est_project(id) ON DELETE CASCADE,
  item_code       text NOT NULL REFERENCES est_item(code),
  estimate_price  bigint NOT NULL,
  actual_price    bigint NOT NULL,
  variance_pct    numeric(7,2) NOT NULL,
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new','applied','ignored')),
  decided_by      text, decided_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
`

export const SQL_015 = `-- 견적 시스템: SBworks SSO 수신(세션·1회용 jti·연결 계정)
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
-- 기존 role 값 'admin' | 'partner' 에 'staff'(SBworks 로 들어온 직원) 추가. 값 검사는 앱(lib/auth-roles.ts Role 타입)이 함
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS est_role text CHECK (est_role IN ('writer','reviewer','ceo'));
UPDATE "user" SET est_role = 'ceo' WHERE role = 'admin' AND est_role IS NULL;  -- 로컬 관리자 = 대표 권한

CREATE TABLE IF NOT EXISTS sso_identity (
  user_id              text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  sbworks_profile_id   uuid NOT NULL UNIQUE,
  email                text NOT NULL,
  tenant_id            uuid NOT NULL,
  tenant_slug          text NOT NULL,
  role_code            text NOT NULL,
  scope                text NOT NULL,
  memberships          jsonb NOT NULL DEFAULT '[]',
  last_login_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sso_identity ADD COLUMN IF NOT EXISTS claims jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS sso_session (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  ip          text, ua text
);
CREATE INDEX IF NOT EXISTS sso_session_user_idx ON sso_session (user_id, expires_at DESC);
CREATE TABLE IF NOT EXISTS sso_nonce (
  jti     text PRIMARY KEY,
  exp     timestamptz NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);
`
