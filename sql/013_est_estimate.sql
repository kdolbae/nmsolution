-- 013_est_estimate: 견적·원가·이익 시스템 (기획서 v1 §4). 이 파일은 scripts/est-sql.ts 가 lib/est/ddl.ts·seed.ts 로 만듦 — 고치려면 그 파일을 고치고 pnpm est:sql.
-- 실행: search_path=nmsolution(sql/README.md B안) 또는 전용 DB. 여러 번 실행해도 안전. 앱도 첫 조회 때 같은 SQL 을 돌림(lib/est/table.ts).
-- 견적 시스템: 판·공정·줄·토의·검사·결재·제출·대장
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
