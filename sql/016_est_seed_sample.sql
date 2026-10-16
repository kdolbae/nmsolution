-- 016_est_seed_sample: 견적·원가·이익 시스템 (기획서 v1 §4). 이 파일은 scripts/est-sql.ts 가 lib/est/ddl.ts·seed.ts 로 만듦 — 고치려면 그 파일을 고치고 pnpm est:sql.
-- 실행: search_path=nmsolution(sql/README.md B안) 또는 전용 DB. 여러 번 실행해도 안전. 앱도 첫 조회 때 같은 SQL 을 돌림(lib/est/table.ts).
-- 견적 시스템: 샘플 마스터·샘플 프로젝트 (전부 "샘플". 실자료가 오면 가져오기로 바꿈)
CREATE TABLE IF NOT EXISTS est_seed (key text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());

-- 설정(샘플 기본값). 화면에서 저장하면 is_sample = false
INSERT INTO est_setting (key, value, label, "group", help, is_sample) VALUES
  ('manager.day_rate_customer', '350000'::jsonb, '담당자 1일 단가(고객 서류)', '담당자', '고객 서류 "현장 조사 및 공사 관리" 1회 단가(원)', true),
  ('manager.day_rate_internal', '300000'::jsonb, '담당자 1일 원가(내부)', '담당자', '예상·최종이익 계산용 내부 원가(원). 고객 서류에 나가지 않음', true),
  ('manager.cost_kind', '"경비"'::jsonb, '담당자 줄 비목', '담당자', '자재·용역·장비·노무·경비 중 하나. 보험료 산정에서 빼려면 경비', true),
  ('manager.line_name', '"현장 조사 및 공사 관리"'::jsonb, '담당자 줄 이름(고객용)', '담당자', NULL, true),
  ('manager.min_visits', '1'::jsonb, '담당자 최소 방문 수', '담당자', '이 미만이면 결재 올리기 불가', true),
  ('manager.item_code', '"MGR-SITE"'::jsonb, '담당자 품목 코드', '담당자', '템플릿에서 이 품목은 담당자 줄로 바뀜', true),
  ('incentive.basis', '"supply_pct"'::jsonb, '인센티브 기준', '인센티브', 'supply_pct(공급가 %) / final_profit_pct(인센티브 전 이익 %) / fixed_per_job(건당 고정)', true),
  ('incentive.pct', '3'::jsonb, '인센티브 비율(%)', '인센티브', NULL, true),
  ('incentive.fixed', '300000'::jsonb, '건당 고정 인센티브(원)', '인센티브', 'fixed_per_job 일 때만 씀', true),
  ('incentive.include_in_expected_cost', 'true'::jsonb, '예상원가에 인센티브 포함', '인센티브', NULL, true),
  ('approval.ceo_threshold_supply', '30000000'::jsonb, '대표 결재 기준 공급가(원)', '결재', '공급가가 이 미만이면 검토자가 최종 승인', true),
  ('approval.steps', '["writer","reviewer","ceo"]'::jsonb, '결재 단계 순서', '결재', 'writer·reviewer·ceo 중에서 순서대로', true),
  ('approval.reviewer_role', '"reviewer"'::jsonb, '검토 단계 역할', '결재', NULL, true),
  ('approval.ceo_self_skip_review', 'true'::jsonb, '대표가 올린 판은 검토 생략', '결재', '대표가 직접 올리면 검토자 단계를 건너뛰고 대표 확인으로 승인', true),
  ('approval.bridge', '"local"'::jsonb, '결재 처리 위치', '결재', 'local(이 앱 안) / sbworks(2단계: SBworks 결재로 넘김)', true),
  ('profit.min_margin_pct', '12'::jsonb, '최소 예상이익률(%)', '이익', NULL, true),
  ('profit.min_margin_severity', '"warn"'::jsonb, '최소 이익률 미달 심각도', '이익', 'warn / error', true),
  ('actual.window_count', '10'::jsonb, '실단가 범위에 쓰는 최근 관측 수', '이익', NULL, true),
  ('actual.typ_method', '"last"'::jsonb, '실단가 대표값', '이익', 'last(최근값) / median(중앙값)', true),
  ('variance.highlight_pct', '10'::jsonb, '단가 차이 표시 기준(%)', '이익', '견적단가와 실단가 차이가 이 % 이상이면 표시·마스터 갱신 후보', true),
  ('cost.include_insurance', 'true'::jsonb, '법정 보험료를 원가에 포함', '이익', NULL, true),
  ('cost.visible_roles', '["reviewer","ceo"]'::jsonb, '실단가·원가 열을 보는 역할', '화면', NULL, true),
  ('rates.default', '"NM_DEFAULT"'::jsonb, '기본 요율 세트 코드', '요율', NULL, true),
  ('doc.valid_days', '30'::jsonb, '견적 유효기간(일)', '문서', NULL, true),
  ('doc.number_prefix', '"NM"'::jsonb, '프로젝트 번호 접두', '문서', NULL, true),
  ('doc.customer_style', '{"font":"Pretendard","navy":"#0F2A44","orange":"#E8742A","tone":"~함"}'::jsonb, '고객 출력물 스타일', '문서', NULL, true),
  ('doc.internal_words', '["원가","마진","이익","인센티브","실단가","메모"]'::jsonb, '고객 문구 금지어', '문서', NULL, true),
  ('doc.confirm_needed_text', '"협의 후 확정"'::jsonb, '미확인 항목 고객 표기', '문서', NULL, true),
  ('check.required_photos', '3'::jsonb, '현장 확인 최소 사진 수', '현장', NULL, true),
  ('check.block_without_photos', 'false'::jsonb, '사진 부족 시 다음 단계 막기', '현장', NULL, true),
  ('profit.visible', '{"writer":"pct","reviewer":"amount","ceo":"amount"}'::jsonb, '이익 보기 범위', '화면', '역할별 none / pct / amount', true),
  ('menu.modules', '{"est":true,"clients":true,"quotes":true,"site":true}'::jsonb, '앱 안 메뉴 모듈', '화면', NULL, true),
  ('sso.role_map', '{"owner":"ceo","branch_manager":"reviewer","staff":"writer","sales":"writer","technician":null,"partner":null,"viewer":null}'::jsonb, 'SBworks 역할 → 견적 역할', 'SSO', 'null = 들어올 수 없음. 표에 없는 역할은 writer', true),
  ('sso.session_hours', '12'::jsonb, 'SSO 세션 시간(시간)', 'SSO', NULL, true),
  ('hq.share_profit', 'false'::jsonb, '본사 요약에 이익률 포함', '본사', NULL, true)
ON CONFLICT (key) DO NOTHING;

-- 분류
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (1, NULL, 'L1-LEAK', '누수 피해복구', 10, '{"rate_set":"LEAK_SIMPLE"}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (1, NULL, 'L1-RENO', '건축 개보수', 20, '{"rate_set":"NM_DEFAULT"}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (1, NULL, 'L1-HEAVY', '공장 설비·중량물', 30, '{"rate_set":"NM_DEFAULT"}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (1, NULL, 'L1-ROOF', '지붕·외장', 40, '{"rate_set":"NM_DEFAULT"}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (2, (SELECT id FROM est_class WHERE code = 'L1-LEAK'), 'L2-LEAK-PIPE', '배관 누수', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (2, (SELECT id FROM est_class WHERE code = 'L1-LEAK'), 'L2-LEAK-ROOF', '옥상 누수', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (2, (SELECT id FROM est_class WHERE code = 'L1-RENO'), 'L2-RENO-IN', '내부 개보수', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (2, (SELECT id FROM est_class WHERE code = 'L1-HEAVY'), 'L2-HEAVY-MOVE', '중량물 이동·안착', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (2, (SELECT id FROM est_class WHERE code = 'L1-HEAVY'), 'L2-HEAVY-INST', '설비 해체·설치', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (2, (SELECT id FROM est_class WHERE code = 'L1-ROOF'), 'L2-ROOF-FIX', '지붕 보수', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), 'L3-LP-DETECT', '탐지·진단', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), 'L3-LP-DEMO', '해체', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), 'L3-LP-PIPE', '배관 보수', 30, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), 'L3-LP-WP', '방수', 40, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), 'L3-LP-FINISH', '마감 복구', 50, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), 'L3-LP-WASTE', '폐기물', 60, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-ROOF'), 'L3-LR-DETECT', '탐지·진단', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-ROOF'), 'L3-LR-DEMO', '해체', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-ROOF'), 'L3-LR-PIPE', '배관 보수', 30, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-ROOF'), 'L3-LR-WP', '방수', 40, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-ROOF'), 'L3-LR-FINISH', '마감 복구', 50, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-LEAK-ROOF'), 'L3-LR-WASTE', '폐기물', 60, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-RENO-IN'), 'L3-RI-DEMO', '철거', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-RENO-IN'), 'L3-RI-MEP', '설비', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-RENO-IN'), 'L3-RI-FINISH', '마감', 30, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-MOVE'), 'L3-HM-BASE', '베이스 작업', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-MOVE'), 'L3-HM-LIFT', '인양', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-MOVE'), 'L3-HM-WELD', '사상·용접', 30, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-MOVE'), 'L3-HM-TEST', '시운전 지원', 40, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-INST'), 'L3-HI-BASE', '베이스 작업', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-INST'), 'L3-HI-LIFT', '인양', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-INST'), 'L3-HI-WELD', '사상·용접', 30, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-HEAVY-INST'), 'L3-HI-TEST', '시운전 지원', 40, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-ROOF-FIX'), 'L3-RF-SCAF', '비계·안전', 10, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-ROOF-FIX'), 'L3-RF-DEMO', '철거', 20, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;
INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (3, (SELECT id FROM est_class WHERE code = 'L2-ROOF-FIX'), 'L3-RF-INST', '설치', 30, '{}'::jsonb) ON CONFLICT (code) DO NOTHING;

-- 체크리스트 질문(공통)
INSERT INTO est_check_question (code, class2_id, label, answer_type, options, unit, required, sort_order) VALUES
  ('hot_work', NULL, '화기작업(용접·절단)이 있음', 'bool', '[]'::jsonb, NULL, true, 10),
  ('hot_work_days', NULL, '화기작업 일수', 'number', '[]'::jsonb, '일', false, 20),
  ('crane', NULL, '크레인 작업이 있음', 'bool', '[]'::jsonb, NULL, true, 30),
  ('crane_ton', NULL, '크레인 규격', 'select', '[{"value":"60","label":"60t"},{"value":"100","label":"100t"},{"value":"200","label":"200t"}]'::jsonb, 't', false, 40),
  ('lift_days', NULL, '인양 일수', 'number', '[]'::jsonb, '일', false, 50),
  ('rigger_people', NULL, '리거(도비) 인원', 'number', '[]'::jsonb, '명', false, 60),
  ('work_days', NULL, '전체 작업 일수', 'number', '[]'::jsonb, '일', true, 70),
  ('height_m', NULL, '작업 높이', 'number', '[]'::jsonb, 'm', false, 80),
  ('area_m2', NULL, '보수 면적', 'number', '[]'::jsonb, '㎡', false, 90),
  ('pipe_m', NULL, '배관 길이', 'number', '[]'::jsonb, 'm', false, 100),
  ('waste_ton', NULL, '폐기물 양', 'number', '[]'::jsonb, '톤', false, 110),
  ('scaffold_m2', NULL, '비계 면적', 'number', '[]'::jsonb, '㎡', false, 120),
  ('power_available', NULL, '발주처 전원 제공', 'bool', '[]'::jsonb, NULL, false, 130),
  ('water_available', NULL, '발주처 용수 제공', 'bool', '[]'::jsonb, NULL, false, 140),
  ('client_provides_crane', NULL, '발주처가 장비(크레인) 제공', 'bool', '[]'::jsonb, NULL, false, 150),
  ('night_work', NULL, '야간작업이 있음', 'bool', '[]'::jsonb, NULL, false, 160),
  ('access_restriction', NULL, '출입·작업 제한 사항', 'text', '[]'::jsonb, NULL, false, 170)
ON CONFLICT (code) DO NOTHING;

-- 요율 세트
INSERT INTO est_rate_set (code, name, mode, rates, truncate_unit, expense_per_crew_day, is_sample) VALUES
  ('NM_DEFAULT', '건설 원가계산(샘플)', 'full', '{"injury":3.56,"employment":1.15,"safety":3.11,"overhead":5,"profit":15}'::jsonb, 1000, 50000, true),
  ('LEAK_SIMPLE', '누수·보험사용 간이(샘플)', 'simple', '{"misc":5,"profit":10}'::jsonb, 1000, 50000, true)
ON CONFLICT (code) DO NOTHING;

-- 품목 + 견적단가(샘플)
INSERT INTO est_item (code, kind, name, spec, unit, qty_rule_type, qty_rule, basis_text, internal_memo, labor_class) VALUES
  ('LAB-RIGGER', '노무', '리거(도비)', '', '인·일', 'people_days', '{"people_q":"rigger_people","days_q":"lift_days"}'::jsonb, '투입 인원 × 인양 일수로 산정함', '샘플 품목', 'partner'),
  ('LAB-WELDER', '노무', '용접사', '', '인·일', 'people_days', '{"people":1,"days_q":"hot_work_days"}'::jsonb, '용접 인원 × 화기작업 일수로 산정함', '샘플 품목', 'partner'),
  ('LAB-HELPER', '노무', '보조공', '', '인·일', 'people_days', '{"people":2,"days_q":"work_days"}'::jsonb, '보조 인원 × 작업 일수로 산정함', '샘플 품목', 'daily'),
  ('LAB-SIGNAL', '노무', '신호수', '', '인·일', 'rule', '{"rule_code":"CRANE_SIGNAL"}'::jsonb, '크레인 인양 시 신호수 배치 기준으로 산정함', '샘플 품목', 'daily'),
  ('LAB-FIRE-WATCH', '노무', '화재감시자', '', '인·일', 'rule', '{"rule_code":"FIRE_WATCH"}'::jsonb, '화기작업 일수 동안 화재감시자 배치 기준으로 산정함', '샘플 품목', 'daily'),
  ('LAB-PLUMBER', '노무', '배관공', '', '인·일', 'people_days', '{"people":2,"days_q":"work_days"}'::jsonb, '배관 인원 × 작업 일수로 산정함', '샘플 품목', 'our_staff'),
  ('LAB-WATERPROOF', '노무', '방수공', '', '인·일', 'area_factor', '{"question":"area_m2","factor":0.05,"round":"up"}'::jsonb, '보수 면적 기준 작업량으로 산정함', '샘플 품목', 'partner'),
  ('LAB-FINISH', '노무', '마감공', '', '인·일', 'area_factor', '{"question":"area_m2","factor":0.08,"round":"up"}'::jsonb, '복구 면적 기준 작업량으로 산정함', '샘플 품목', 'partner'),
  ('EQP-CRANE-100T', '장비', '크레인 100t', '100t 하이드로 크레인', '일', 'answer', '{"question":"lift_days"}'::jsonb, '인양 일수 기준 장비 임차로 산정함', '샘플 품목', NULL),
  ('EQP-CRANE-60T', '장비', '크레인 60t', '60t 하이드로 크레인', '일', 'answer', '{"question":"lift_days"}'::jsonb, '인양 일수 기준 장비 임차로 산정함', '샘플 품목', NULL),
  ('EQP-SKY', '장비', '고소작업차', '', '일', 'answer', '{"question":"work_days"}'::jsonb, '작업 일수 기준 장비 임차로 산정함', '샘플 품목', NULL),
  ('EQP-LEAK-DETECT', '장비', '누수 탐지 장비', '', '식', 'fixed', '{"qty":1}'::jsonb, '누수 지점 탐지·진단 1식으로 산정함', '샘플 품목', NULL),
  ('MAT-SLING', '자재', '와이어·슬링 세트', '', '식', 'fixed', '{"qty":1}'::jsonb, '인양 하중 기준 줄걸이 자재 1식으로 산정함', '샘플 품목', NULL),
  ('MAT-PIPE', '자재', '배관 자재', '', 'm', 'answer', '{"question":"pipe_m"}'::jsonb, '교체 배관 길이 기준으로 산정함', '샘플 품목', NULL),
  ('MAT-WATERPROOF', '자재', '우레탄 방수재', '', '㎡', 'answer', '{"question":"area_m2"}'::jsonb, '방수 면적 기준으로 산정함', '샘플 품목', NULL),
  ('MAT-FINISH', '자재', '마감 자재', '', '㎡', 'answer', '{"question":"area_m2"}'::jsonb, '복구 면적 기준으로 산정함', '샘플 품목', NULL),
  ('SVC-WASTE', '용역', '폐기물 처리', '', '톤', 'answer', '{"question":"waste_ton"}'::jsonb, '발생 폐기물 양 기준으로 산정함', '샘플 품목', NULL),
  ('SVC-SCAFFOLD', '용역', '비계 설치·해체', '', '㎡', 'answer', '{"question":"scaffold_m2"}'::jsonb, '비계 면적 기준으로 산정함', '샘플 품목', NULL),
  ('EXP-SAFETY', '경비', '안전시설·소모품', '', '식', 'fixed', '{"qty":1}'::jsonb, '현장 안전시설·소모품 1식으로 산정함', '샘플 품목', NULL),
  ('EXP-TRANSPORT', '경비', '운반비', '', '회', 'fixed', '{"qty":1}'::jsonb, '자재·장비 반입·반출 기준으로 산정함', '샘플 품목', NULL),
  ('MGR-SITE', '경비', '현장 조사 및 공사 관리', '', '회', 'visits', '{}'::jsonb, '현장 조사·공정 관리 방문 횟수 기준으로 산정함', '샘플 품목', NULL)
ON CONFLICT (code) DO NOTHING;
INSERT INTO est_item_price (item_code, price, effective_from, note, source)
SELECT v.code, v.price, DATE '2026-10-01', '샘플', 'manual' FROM (VALUES
  ('LAB-RIGGER', 300000),
  ('LAB-WELDER', 350000),
  ('LAB-HELPER', 180000),
  ('LAB-SIGNAL', 180000),
  ('LAB-FIRE-WATCH', 180000),
  ('LAB-PLUMBER', 320000),
  ('LAB-WATERPROOF', 300000),
  ('LAB-FINISH', 280000),
  ('EQP-CRANE-100T', 2500000),
  ('EQP-CRANE-60T', 1500000),
  ('EQP-SKY', 450000),
  ('EQP-LEAK-DETECT', 300000),
  ('MAT-SLING', 400000),
  ('MAT-PIPE', 25000),
  ('MAT-WATERPROOF', 18000),
  ('MAT-FINISH', 30000),
  ('SVC-WASTE', 250000),
  ('SVC-SCAFFOLD', 15000),
  ('EXP-SAFETY', 200000),
  ('EXP-TRANSPORT', 150000),
  ('MGR-SITE', 350000)
) AS v(code, price)
WHERE NOT EXISTS (SELECT 1 FROM est_item_price p WHERE p.item_code = v.code);

-- 실단가 관측(샘플)·노무 실단가(샘플)
INSERT INTO est_actual_cost (item_code, source, unit_price, observed_on, note)
SELECT v.code, v.source, v.price, v.on_date::date, '샘플' FROM (VALUES
  ('LAB-RIGGER', 'subcontract_contract', 300000, '2026-05-10'),
  ('LAB-RIGGER', 'subcontract_contract', 260000, '2026-07-02'),
  ('LAB-RIGGER', 'subcontract_contract', 280000, '2026-09-15'),
  ('LAB-SIGNAL', 'labor', 150000, '2026-05-10'),
  ('LAB-SIGNAL', 'labor', 175000, '2026-07-02'),
  ('LAB-SIGNAL', 'labor', 160000, '2026-09-15'),
  ('EQP-CRANE-100T', 'rental', 2600000, '2026-04-20'),
  ('EQP-CRANE-100T', 'rental', 2000000, '2026-06-11'),
  ('EQP-CRANE-100T', 'rental', 2200000, '2026-09-15'),
  ('MAT-SLING', 'purchase', 420000, '2026-03-02'),
  ('MAT-SLING', 'purchase', 300000, '2026-06-11'),
  ('MAT-SLING', 'purchase', 350000, '2026-09-15'),
  ('LAB-WELDER', 'subcontract_contract', 330000, '2026-06-01'),
  ('LAB-WELDER', 'subcontract_contract', 310000, '2026-08-01'),
  ('LAB-WELDER', 'subcontract_contract', 320000, '2026-09-20'),
  ('LAB-HELPER', 'labor', 160000, '2026-06-01'),
  ('LAB-HELPER', 'labor', 150000, '2026-08-01'),
  ('LAB-HELPER', 'labor', 155000, '2026-09-20'),
  ('LAB-PLUMBER', 'labor', 270000, '2026-05-01'),
  ('LAB-PLUMBER', 'labor', 290000, '2026-07-01'),
  ('LAB-PLUMBER', 'labor', 280000, '2026-09-01'),
  ('EQP-CRANE-60T', 'rental', 1300000, '2026-05-01'),
  ('EQP-CRANE-60T', 'rental', 1250000, '2026-08-01'),
  ('EQP-CRANE-60T', 'rental', 1300000, '2026-09-10'),
  ('EQP-SKY', 'rental', 380000, '2026-05-01'),
  ('EQP-SKY', 'rental', 400000, '2026-08-01'),
  ('EQP-SKY', 'rental', 390000, '2026-09-10'),
  ('MAT-PIPE', 'purchase', 19000, '2026-05-01'),
  ('MAT-PIPE', 'purchase', 21000, '2026-08-01'),
  ('MAT-PIPE', 'purchase', 20000, '2026-09-10'),
  ('SVC-WASTE', 'subcontract_contract', 220000, '2026-05-01'),
  ('SVC-WASTE', 'subcontract_contract', 200000, '2026-08-01'),
  ('SVC-WASTE', 'subcontract_contract', 210000, '2026-09-10'),
  ('EXP-SAFETY', 'expense', 150000, '2026-06-01'),
  ('EXP-SAFETY', 'expense', 180000, '2026-08-01'),
  ('EXP-SAFETY', 'expense', 170000, '2026-09-10'),
  ('EXP-TRANSPORT', 'expense', 120000, '2026-06-01'),
  ('EXP-TRANSPORT', 'expense', 130000, '2026-08-01'),
  ('EXP-TRANSPORT', 'expense', 125000, '2026-09-10')
) AS v(code, source, price, on_date)
WHERE NOT EXISTS (SELECT 1 FROM est_actual_cost WHERE note = '샘플');
INSERT INTO est_labor_rate (labor_class, item_code, day_rate, overtime_factor, night_factor, effective_from, note)
SELECT v.cls, NULL, v.rate, 1.5, 1.5, DATE '2026-10-01', '샘플' FROM (VALUES ('our_staff', 250000), ('daily', 200000), ('partner', 280000)) AS v(cls, rate)
WHERE NOT EXISTS (SELECT 1 FROM est_labor_rate WHERE note = '샘플');

-- 템플릿
INSERT INTO est_template (class2_id, name, version, rate_set_id, note) VALUES ((SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), '배관 누수 기본(샘플)', 1, (SELECT id FROM est_rate_set WHERE code = 'LEAK_SIMPLE'), '샘플') ON CONFLICT (class2_id, version) DO NOTHING;
INSERT INTO est_template_item (template_id, class3_id, item_code, grade, condition, remove_if, sort_order)
SELECT t.id, (SELECT id FROM est_class WHERE code = v.c3), v.item, v.grade, v.cond::jsonb, v.rm::jsonb, v.sort FROM (VALUES
  ('EQP-LEAK-DETECT', 'required', 'L3-LP-DETECT', NULL, NULL, 10),
  ('MGR-SITE', 'required', 'L3-LP-DETECT', NULL, NULL, 20),
  ('LAB-PLUMBER', 'required', 'L3-LP-PIPE', NULL, NULL, 30),
  ('MAT-PIPE', 'required', 'L3-LP-PIPE', NULL, NULL, 40),
  ('LAB-HELPER', 'basic', 'L3-LP-PIPE', NULL, NULL, 50),
  ('EQP-SKY', 'conditional', 'L3-LP-PIPE', '{"question":"height_m","op":"gte","value":3}', NULL, 60),
  ('EXP-SAFETY', 'required', 'L3-LP-PIPE', NULL, NULL, 70),
  ('LAB-WATERPROOF', 'conditional', 'L3-LP-WP', '{"question":"area_m2","op":"gt","value":0}', NULL, 80),
  ('MAT-WATERPROOF', 'conditional', 'L3-LP-WP', '{"question":"area_m2","op":"gt","value":0}', NULL, 90),
  ('MAT-FINISH', 'basic', 'L3-LP-FINISH', NULL, NULL, 100),
  ('LAB-FINISH', 'basic', 'L3-LP-FINISH', NULL, NULL, 110),
  ('EXP-TRANSPORT', 'basic', 'L3-LP-FINISH', NULL, NULL, 120),
  ('SVC-WASTE', 'basic', 'L3-LP-WASTE', NULL, NULL, 130)
) AS v(item, grade, c3, cond, rm, sort)
CROSS JOIN (SELECT id FROM est_template WHERE class2_id = (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE') AND version = 1) t
ON CONFLICT (template_id, item_code) DO NOTHING;
INSERT INTO est_template (class2_id, name, version, rate_set_id, note) VALUES ((SELECT id FROM est_class WHERE code = 'L2-HEAVY-MOVE'), '중량물 이동·안착 기본(샘플)', 1, (SELECT id FROM est_rate_set WHERE code = 'NM_DEFAULT'), '샘플') ON CONFLICT (class2_id, version) DO NOTHING;
INSERT INTO est_template_item (template_id, class3_id, item_code, grade, condition, remove_if, sort_order)
SELECT t.id, (SELECT id FROM est_class WHERE code = v.c3), v.item, v.grade, v.cond::jsonb, v.rm::jsonb, v.sort FROM (VALUES
  ('LAB-RIGGER', 'required', 'L3-HM-LIFT', NULL, NULL, 10),
  ('MAT-SLING', 'required', 'L3-HM-LIFT', NULL, NULL, 20),
  ('EQP-CRANE-100T', 'basic', 'L3-HM-LIFT', NULL, '{"question":"client_provides_crane","op":"truthy","reason":"client_provides","note":"현장 확인: 발주처 장비 제공"}', 30),
  ('EQP-CRANE-60T', 'conditional', 'L3-HM-LIFT', '{"question":"crane_ton","op":"eq","value":60}', NULL, 40),
  ('LAB-HELPER', 'basic', 'L3-HM-LIFT', NULL, NULL, 50),
  ('EXP-SAFETY', 'required', 'L3-HM-LIFT', NULL, NULL, 60),
  ('EXP-TRANSPORT', 'basic', 'L3-HM-LIFT', NULL, NULL, 70),
  ('MGR-SITE', 'required', 'L3-HM-LIFT', NULL, NULL, 80),
  ('LAB-WELDER', 'conditional', 'L3-HM-WELD', '{"question":"hot_work","op":"eq","value":true}', NULL, 90)
) AS v(item, grade, c3, cond, rm, sort)
CROSS JOIN (SELECT id FROM est_template WHERE class2_id = (SELECT id FROM est_class WHERE code = 'L2-HEAVY-MOVE') AND version = 1) t
ON CONFLICT (template_id, item_code) DO NOTHING;

-- 규칙표(전 사업 공통)
INSERT INTO est_rule (code, class1_id, name, condition, action, message, severity, sort_order) VALUES
  ('FIRE_WATCH', NULL, '화기작업 → 화재감시자', '{"question":"hot_work","op":"eq","value":true}'::jsonb, '{"add_item":"LAB-FIRE-WATCH","qty":{"type":"answer_mul","question":"hot_work_days","factor":1}}'::jsonb, '화기작업인데 화재감시자가 없음', 'error', 10),
  ('CRANE_SIGNAL', NULL, '크레인 → 신호수', '{"question":"crane","op":"eq","value":true}'::jsonb, '{"add_item":"LAB-SIGNAL","qty":{"type":"people_times_answer","people":2,"question":"lift_days"}}'::jsonb, '크레인 작업인데 신호수가 없음', 'error', 20),
  ('NIGHT_PREMIUM', NULL, '야간작업 알림', '{"question":"night_work","op":"eq","value":true}'::jsonb, '{}'::jsonb, '야간작업 — 노무 단가 야간 배수 확인', 'warn', 30),
  ('SCAFFOLD_HEIGHT', NULL, '높이 2m 이상 → 비계·고소장비', '{"all":[{"question":"height_m","op":"gte","value":2},{"question":"scaffold_m2","op":"eq","value":0}]}'::jsonb, '{}'::jsonb, '2m 이상인데 비계·고소장비 없음', 'warn', 40)
ON CONFLICT (code) DO NOTHING;

-- 샘플 발주처·샘플 프로젝트 2건 (기존 금강변압기 줄은 건드리지 않음)
INSERT INTO clients (name, site_address, memo) SELECT '샘플 발주처', '경기도 평택시 샘플산업단지 1', '견적 시스템 샘플' WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = '샘플 발주처');
INSERT INTO est_project (number, title, client_id, client_type, site_address, inquiry_text, class1_id, class2_id, stage, manager_visits_planned, site_summary, created_by)
VALUES ('NM-2610-S01', '샘플·공장 변압기 이동 안착', (SELECT min(id) FROM clients WHERE name = '샘플 발주처'), 'company', '경기도 평택시 샘플산업단지 1 2동', '변압기 1기를 2동 기초 위로 옮겨 안착하고 싶음',
  (SELECT id FROM est_class WHERE code = 'L1-HEAVY'), (SELECT id FROM est_class WHERE code = 'L2-HEAVY-MOVE'), 'P3', 3, '샘플 프로젝트', 'system')
ON CONFLICT (number) DO NOTHING;
INSERT INTO est_project (number, title, client_id, client_type, site_address, inquiry_text, class1_id, class2_id, stage, manager_visits_planned, site_summary, created_by)
VALUES ('NM-2610-S02', '샘플·지하 배관 누수 복구', (SELECT min(id) FROM clients WHERE name = '샘플 발주처'), 'company', '경기도 평택시 샘플산업단지 1 지하 기계실', '지하 기계실 천장에서 물이 샘. 보험 처리 예정',
  (SELECT id FROM est_class WHERE code = 'L1-LEAK'), (SELECT id FROM est_class WHERE code = 'L2-LEAK-PIPE'), 'P2', 1, '샘플 프로젝트', 'system')
ON CONFLICT (number) DO NOTHING;
INSERT INTO est_check_answer (project_id, question_id, value, answered_by)
SELECT p.id, qn.id, v.val::jsonb, 'system' FROM (VALUES
  ('hot_work', 'false'),
  ('crane', 'true'),
  ('crane_ton', '"100"'),
  ('lift_days', '2'),
  ('rigger_people', '4'),
  ('work_days', '3'),
  ('height_m', '6'),
  ('power_available', 'true'),
  ('water_available', 'true'),
  ('client_provides_crane', 'false'),
  ('night_work', 'false'),
  ('access_restriction', '"공장 가동 중, 주간 작업만 가능"'),
  ('scaffold_m2', '0')
) AS v(code, val)
JOIN est_check_question qn ON qn.code = v.code
CROSS JOIN (SELECT id FROM est_project WHERE number = 'NM-2610-S01') p
ON CONFLICT (project_id, question_id) DO NOTHING;
INSERT INTO est_check_answer (project_id, question_id, value, answered_by)
SELECT p.id, qn.id, v.val::jsonb, 'system' FROM (VALUES
  ('hot_work', 'false'),
  ('crane', 'false'),
  ('pipe_m', '12'),
  ('work_days', '2')
) AS v(code, val)
JOIN est_check_question qn ON qn.code = v.code
CROSS JOIN (SELECT id FROM est_project WHERE number = 'NM-2610-S02') p
ON CONFLICT (project_id, question_id) DO NOTHING;
-- S01 의 A안 초안은 앱이 처음 열릴 때 같은 엔진(lib/est/draft.ts)으로 만듦(est_seed 'sample_draft_s01')
