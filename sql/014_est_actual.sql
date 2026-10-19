-- 014_est_actual: 견적·원가·이익 시스템 (기획서 v1 §4). 이 파일은 scripts/est-sql.ts 가 lib/est/ddl.ts·seed.ts 로 만듦 — 고치려면 그 파일을 고치고 pnpm est:sql.
-- 실행: search_path=nmsolution(sql/README.md B안) 또는 전용 DB. 여러 번 실행해도 안전. 앱도 첫 조회 때 같은 SQL 을 돌림(lib/est/table.ts).
-- 견적 시스템: 실제 지출 DB·실행·정산
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
