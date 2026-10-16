-- 011_est_settings_masters: 견적·원가·이익 시스템 (기획서 v1 §4). 이 파일은 scripts/est-sql.ts 가 lib/est/ddl.ts·seed.ts 로 만듦 — 고치려면 그 파일을 고치고 pnpm est:sql.
-- 실행: search_path=nmsolution(sql/README.md B안) 또는 전용 DB. 여러 번 실행해도 안전. 앱도 첫 조회 때 같은 SQL 을 돌림(lib/est/table.ts).
-- 견적 시스템: 설정·분류·체크리스트 질문·품목·단가·요율·템플릿·규칙
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
