/**
 * 샘플 마스터(sql/016_est_seed_sample.sql). 전부 "샘플" 표식(is_sample / note '샘플'), 여러 번 실행해도 안전.
 * 실자료(NM_견적DB_v1.xlsx)가 오면 마스터 화면의 가져오기(2단계)로 바꿈.
 */
import { SETTING_DEFAULTS } from './settings-defaults'

const q = (s: string) => `'${s.replace(/'/g, "''")}'`
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`

type C = [level: number, parent: string | null, code: string, name: string, sort: number, meta?: unknown]
const CLASSES: C[] = [
  [1, null, 'L1-LEAK', '누수 피해복구', 10, { rate_set: 'LEAK_SIMPLE' }],
  [1, null, 'L1-RENO', '건축 개보수', 20, { rate_set: 'NM_DEFAULT' }],
  [1, null, 'L1-HEAVY', '공장 설비·중량물', 30, { rate_set: 'NM_DEFAULT' }],
  [1, null, 'L1-ROOF', '지붕·외장', 40, { rate_set: 'NM_DEFAULT' }],
  [2, 'L1-LEAK', 'L2-LEAK-PIPE', '배관 누수', 10],
  [2, 'L1-LEAK', 'L2-LEAK-ROOF', '옥상 누수', 20],
  [2, 'L1-RENO', 'L2-RENO-IN', '내부 개보수', 10],
  [2, 'L1-HEAVY', 'L2-HEAVY-MOVE', '중량물 이동·안착', 10],
  [2, 'L1-HEAVY', 'L2-HEAVY-INST', '설비 해체·설치', 20],
  [2, 'L1-ROOF', 'L2-ROOF-FIX', '지붕 보수', 10],
  ...(['L2-LEAK-PIPE', 'L2-LEAK-ROOF'] as const).flatMap((p, k): C[] => {
    const pre = k ? 'L3-LR' : 'L3-LP'
    return [
      [3, p, `${pre}-DETECT`, '탐지·진단', 10],
      [3, p, `${pre}-DEMO`, '해체', 20],
      [3, p, `${pre}-PIPE`, '배관 보수', 30],
      [3, p, `${pre}-WP`, '방수', 40],
      [3, p, `${pre}-FINISH`, '마감 복구', 50],
      [3, p, `${pre}-WASTE`, '폐기물', 60],
    ]
  }),
  [3, 'L2-RENO-IN', 'L3-RI-DEMO', '철거', 10],
  [3, 'L2-RENO-IN', 'L3-RI-MEP', '설비', 20],
  [3, 'L2-RENO-IN', 'L3-RI-FINISH', '마감', 30],
  ...(['L2-HEAVY-MOVE', 'L2-HEAVY-INST'] as const).flatMap((p, k): C[] => {
    const pre = k ? 'L3-HI' : 'L3-HM'
    return [
      [3, p, `${pre}-BASE`, '베이스 작업', 10],
      [3, p, `${pre}-LIFT`, '인양', 20],
      [3, p, `${pre}-WELD`, '사상·용접', 30],
      [3, p, `${pre}-TEST`, '시운전 지원', 40],
    ]
  }),
  [3, 'L2-ROOF-FIX', 'L3-RF-SCAF', '비계·안전', 10],
  [3, 'L2-ROOF-FIX', 'L3-RF-DEMO', '철거', 20],
  [3, 'L2-ROOF-FIX', 'L3-RF-INST', '설치', 30],
]

type Qn = [code: string, label: string, type: string, unit: string | null, required: boolean, options?: unknown]
const QUESTIONS: Qn[] = [
  ['hot_work', '화기작업(용접·절단)이 있음', 'bool', null, true],
  ['hot_work_days', '화기작업 일수', 'number', '일', false],
  ['crane', '크레인 작업이 있음', 'bool', null, true],
  ['crane_ton', '크레인 규격', 'select', 't', false, [{ value: '60', label: '60t' }, { value: '100', label: '100t' }, { value: '200', label: '200t' }]],
  ['lift_days', '인양 일수', 'number', '일', false],
  ['rigger_people', '리거(도비) 인원', 'number', '명', false],
  ['work_days', '전체 작업 일수', 'number', '일', true],
  ['height_m', '작업 높이', 'number', 'm', false],
  ['area_m2', '보수 면적', 'number', '㎡', false],
  ['pipe_m', '배관 길이', 'number', 'm', false],
  ['waste_ton', '폐기물 양', 'number', '톤', false],
  ['scaffold_m2', '비계 면적', 'number', '㎡', false],
  ['power_available', '발주처 전원 제공', 'bool', null, false],
  ['water_available', '발주처 용수 제공', 'bool', null, false],
  ['client_provides_crane', '발주처가 장비(크레인) 제공', 'bool', null, false],
  ['night_work', '야간작업이 있음', 'bool', null, false],
  ['access_restriction', '출입·작업 제한 사항', 'text', null, false],
]

type It = [code: string, kind: string, name: string, unit: string, price: number, ruleType: string, rule: unknown, basis: string, labor?: string, spec?: string]
export const SAMPLE_ITEMS: It[] = [
  ['LAB-RIGGER', '노무', '리거(도비)', '인·일', 300000, 'people_days', { people_q: 'rigger_people', days_q: 'lift_days' }, '투입 인원 × 인양 일수로 산정함', 'partner'],
  ['LAB-WELDER', '노무', '용접사', '인·일', 350000, 'people_days', { people: 1, days_q: 'hot_work_days' }, '용접 인원 × 화기작업 일수로 산정함', 'partner'],
  ['LAB-HELPER', '노무', '보조공', '인·일', 180000, 'people_days', { people: 2, days_q: 'work_days' }, '보조 인원 × 작업 일수로 산정함', 'daily'],
  ['LAB-SIGNAL', '노무', '신호수', '인·일', 180000, 'rule', { rule_code: 'CRANE_SIGNAL' }, '크레인 인양 시 신호수 배치 기준으로 산정함', 'daily'],
  ['LAB-FIRE-WATCH', '노무', '화재감시자', '인·일', 180000, 'rule', { rule_code: 'FIRE_WATCH' }, '화기작업 일수 동안 화재감시자 배치 기준으로 산정함', 'daily'],
  ['LAB-PLUMBER', '노무', '배관공', '인·일', 320000, 'people_days', { people: 2, days_q: 'work_days' }, '배관 인원 × 작업 일수로 산정함', 'our_staff'],
  ['LAB-WATERPROOF', '노무', '방수공', '인·일', 300000, 'area_factor', { question: 'area_m2', factor: 0.05, round: 'up' }, '보수 면적 기준 작업량으로 산정함', 'partner'],
  ['LAB-FINISH', '노무', '마감공', '인·일', 280000, 'area_factor', { question: 'area_m2', factor: 0.08, round: 'up' }, '복구 면적 기준 작업량으로 산정함', 'partner'],
  ['EQP-CRANE-100T', '장비', '크레인 100t', '일', 2500000, 'answer', { question: 'lift_days' }, '인양 일수 기준 장비 임차로 산정함', undefined, '100t 하이드로 크레인'],
  ['EQP-CRANE-60T', '장비', '크레인 60t', '일', 1500000, 'answer', { question: 'lift_days' }, '인양 일수 기준 장비 임차로 산정함', undefined, '60t 하이드로 크레인'],
  ['EQP-SKY', '장비', '고소작업차', '일', 450000, 'answer', { question: 'work_days' }, '작업 일수 기준 장비 임차로 산정함'],
  ['EQP-LEAK-DETECT', '장비', '누수 탐지 장비', '식', 300000, 'fixed', { qty: 1 }, '누수 지점 탐지·진단 1식으로 산정함'],
  ['MAT-SLING', '자재', '와이어·슬링 세트', '식', 400000, 'fixed', { qty: 1 }, '인양 하중 기준 줄걸이 자재 1식으로 산정함'],
  ['MAT-PIPE', '자재', '배관 자재', 'm', 25000, 'answer', { question: 'pipe_m' }, '교체 배관 길이 기준으로 산정함'],
  ['MAT-WATERPROOF', '자재', '우레탄 방수재', '㎡', 18000, 'answer', { question: 'area_m2' }, '방수 면적 기준으로 산정함'],
  ['MAT-FINISH', '자재', '마감 자재', '㎡', 30000, 'answer', { question: 'area_m2' }, '복구 면적 기준으로 산정함'],
  ['SVC-WASTE', '용역', '폐기물 처리', '톤', 250000, 'answer', { question: 'waste_ton' }, '발생 폐기물 양 기준으로 산정함'],
  ['SVC-SCAFFOLD', '용역', '비계 설치·해체', '㎡', 15000, 'answer', { question: 'scaffold_m2' }, '비계 면적 기준으로 산정함'],
  ['EXP-SAFETY', '경비', '안전시설·소모품', '식', 200000, 'fixed', { qty: 1 }, '현장 안전시설·소모품 1식으로 산정함'],
  ['EXP-TRANSPORT', '경비', '운반비', '회', 150000, 'fixed', { qty: 1 }, '자재·장비 반입·반출 기준으로 산정함'],
  ['MGR-SITE', '경비', '현장 조사 및 공사 관리', '회', 350000, 'visits', {}, '현장 조사·공정 관리 방문 횟수 기준으로 산정함'],
]

/** [품목, [단가, 관측일]...] — 마지막(가장 늦은) 값이 대표값(last) */
const ACTUALS: [string, string, [number, string][]][] = [
  ['LAB-RIGGER', 'subcontract_contract', [[300000, '2026-05-10'], [260000, '2026-07-02'], [280000, '2026-09-15']]],
  ['LAB-SIGNAL', 'labor', [[150000, '2026-05-10'], [175000, '2026-07-02'], [160000, '2026-09-15']]],
  ['EQP-CRANE-100T', 'rental', [[2600000, '2026-04-20'], [2000000, '2026-06-11'], [2200000, '2026-09-15']]],
  ['MAT-SLING', 'purchase', [[420000, '2026-03-02'], [300000, '2026-06-11'], [350000, '2026-09-15']]],
  ['LAB-WELDER', 'subcontract_contract', [[330000, '2026-06-01'], [310000, '2026-08-01'], [320000, '2026-09-20']]],
  ['LAB-HELPER', 'labor', [[160000, '2026-06-01'], [150000, '2026-08-01'], [155000, '2026-09-20']]],
  ['LAB-PLUMBER', 'labor', [[270000, '2026-05-01'], [290000, '2026-07-01'], [280000, '2026-09-01']]],
  ['EQP-CRANE-60T', 'rental', [[1300000, '2026-05-01'], [1250000, '2026-08-01'], [1300000, '2026-09-10']]],
  ['EQP-SKY', 'rental', [[380000, '2026-05-01'], [400000, '2026-08-01'], [390000, '2026-09-10']]],
  ['MAT-PIPE', 'purchase', [[19000, '2026-05-01'], [21000, '2026-08-01'], [20000, '2026-09-10']]],
  ['SVC-WASTE', 'subcontract_contract', [[220000, '2026-05-01'], [200000, '2026-08-01'], [210000, '2026-09-10']]],
  ['EXP-SAFETY', 'expense', [[150000, '2026-06-01'], [180000, '2026-08-01'], [170000, '2026-09-10']]],
  ['EXP-TRANSPORT', 'expense', [[120000, '2026-06-01'], [130000, '2026-08-01'], [125000, '2026-09-10']]],
]

type TI = [item: string, grade: 'required' | 'basic' | 'conditional', class3: string, condition?: unknown, removeIf?: unknown]
const TEMPLATES: { class2: string; name: string; rate: string; items: TI[] }[] = [
  {
    class2: 'L2-LEAK-PIPE',
    name: '배관 누수 기본(샘플)',
    rate: 'LEAK_SIMPLE',
    items: [
      ['EQP-LEAK-DETECT', 'required', 'L3-LP-DETECT'],
      ['MGR-SITE', 'required', 'L3-LP-DETECT'],
      ['LAB-PLUMBER', 'required', 'L3-LP-PIPE'],
      ['MAT-PIPE', 'required', 'L3-LP-PIPE'],
      ['LAB-HELPER', 'basic', 'L3-LP-PIPE'],
      ['EQP-SKY', 'conditional', 'L3-LP-PIPE', { question: 'height_m', op: 'gte', value: 3 }],
      ['EXP-SAFETY', 'required', 'L3-LP-PIPE'],
      ['LAB-WATERPROOF', 'conditional', 'L3-LP-WP', { question: 'area_m2', op: 'gt', value: 0 }],
      ['MAT-WATERPROOF', 'conditional', 'L3-LP-WP', { question: 'area_m2', op: 'gt', value: 0 }],
      ['MAT-FINISH', 'basic', 'L3-LP-FINISH'],
      ['LAB-FINISH', 'basic', 'L3-LP-FINISH'],
      ['EXP-TRANSPORT', 'basic', 'L3-LP-FINISH'],
      ['SVC-WASTE', 'basic', 'L3-LP-WASTE'],
    ],
  },
  {
    class2: 'L2-HEAVY-MOVE',
    name: '중량물 이동·안착 기본(샘플)',
    rate: 'NM_DEFAULT',
    items: [
      ['LAB-RIGGER', 'required', 'L3-HM-LIFT'],
      ['MAT-SLING', 'required', 'L3-HM-LIFT'],
      ['EQP-CRANE-100T', 'basic', 'L3-HM-LIFT', null, { question: 'client_provides_crane', op: 'truthy', reason: 'client_provides', note: '현장 확인: 발주처 장비 제공' }],
      ['EQP-CRANE-60T', 'conditional', 'L3-HM-LIFT', { question: 'crane_ton', op: 'eq', value: 60 }],
      ['LAB-HELPER', 'basic', 'L3-HM-LIFT'],
      ['EXP-SAFETY', 'required', 'L3-HM-LIFT'],
      ['EXP-TRANSPORT', 'basic', 'L3-HM-LIFT'],
      ['MGR-SITE', 'required', 'L3-HM-LIFT'],
      ['LAB-WELDER', 'conditional', 'L3-HM-WELD', { question: 'hot_work', op: 'eq', value: true }],
    ],
  },
]

const RULES: [code: string, name: string, cond: unknown, action: unknown, message: string, severity: string, sort: number][] = [
  ['FIRE_WATCH', '화기작업 → 화재감시자', { question: 'hot_work', op: 'eq', value: true }, { add_item: 'LAB-FIRE-WATCH', qty: { type: 'answer_mul', question: 'hot_work_days', factor: 1 } }, '화기작업인데 화재감시자가 없음', 'error', 10],
  ['CRANE_SIGNAL', '크레인 → 신호수', { question: 'crane', op: 'eq', value: true }, { add_item: 'LAB-SIGNAL', qty: { type: 'people_times_answer', people: 2, question: 'lift_days' } }, '크레인 작업인데 신호수가 없음', 'error', 20],
  ['NIGHT_PREMIUM', '야간작업 알림', { question: 'night_work', op: 'eq', value: true }, {}, '야간작업 — 노무 단가 야간 배수 확인', 'warn', 30],
  ['SCAFFOLD_HEIGHT', '높이 2m 이상 → 비계·고소장비', { all: [{ question: 'height_m', op: 'gte', value: 2 }, { question: 'scaffold_m2', op: 'eq', value: 0 }] }, {}, '2m 이상인데 비계·고소장비 없음', 'warn', 40],
]

/** S01 샘플 답(중량물) · S02(누수, 현장 확인 중) */
const S01_ANSWERS: Record<string, unknown> = {
  hot_work: false, crane: true, crane_ton: '100', lift_days: 2, rigger_people: 4, work_days: 3, height_m: 6,
  power_available: true, water_available: true, client_provides_crane: false, night_work: false,
  access_restriction: '공장 가동 중, 주간 작업만 가능', scaffold_m2: 0,
}
const S02_ANSWERS: Record<string, unknown> = { hot_work: false, crane: false, pipe_m: 12, work_days: 2 }

export function seedSql(): string {
  const out: string[] = ['-- 견적 시스템: 샘플 마스터·샘플 프로젝트 (전부 "샘플". 실자료가 오면 가져오기로 바꿈)']
  out.push(`CREATE TABLE IF NOT EXISTS est_seed (key text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());`)

  out.push('\n-- 설정(샘플 기본값). 화면에서 저장하면 is_sample = false')
  out.push(
    `INSERT INTO est_setting (key, value, label, "group", help, is_sample) VALUES\n${SETTING_DEFAULTS.map(
      (d) => `  (${q(d.key)}, ${j(d.value)}, ${q(d.label)}, ${q(d.group)}, ${d.help ? q(d.help) : 'NULL'}, true)`,
    ).join(',\n')}\nON CONFLICT (key) DO NOTHING;`,
  )

  out.push('\n-- 분류')
  for (const [level, parent, code, name, sort, meta] of CLASSES) {
    out.push(
      `INSERT INTO est_class (level, parent_id, code, name, sort_order, meta) VALUES (${level}, ${parent ? `(SELECT id FROM est_class WHERE code = ${q(parent)})` : 'NULL'}, ${q(code)}, ${q(name)}, ${sort}, ${j(meta ?? {})}) ON CONFLICT (code) DO NOTHING;`,
    )
  }

  out.push('\n-- 체크리스트 질문(공통)')
  out.push(
    `INSERT INTO est_check_question (code, class2_id, label, answer_type, options, unit, required, sort_order) VALUES\n${QUESTIONS.map(
      ([code, label, type, unit, req, opts], i) => `  (${q(code)}, NULL, ${q(label)}, ${q(type)}, ${j(opts ?? [])}, ${unit ? q(unit) : 'NULL'}, ${req}, ${(i + 1) * 10})`,
    ).join(',\n')}\nON CONFLICT (code) DO NOTHING;`,
  )

  out.push('\n-- 요율 세트')
  out.push(`INSERT INTO est_rate_set (code, name, mode, rates, truncate_unit, expense_per_crew_day, is_sample) VALUES
  ('NM_DEFAULT', '건설 원가계산(샘플)', 'full', ${j({ injury: 3.56, employment: 1.15, safety: 3.11, overhead: 5, profit: 15 })}, 1000, 50000, true),
  ('LEAK_SIMPLE', '누수·보험사용 간이(샘플)', 'simple', ${j({ misc: 5, profit: 10 })}, 1000, 50000, true)
ON CONFLICT (code) DO NOTHING;`)

  out.push('\n-- 품목 + 견적단가(샘플)')
  out.push(
    `INSERT INTO est_item (code, kind, name, spec, unit, qty_rule_type, qty_rule, basis_text, internal_memo, labor_class) VALUES\n${SAMPLE_ITEMS.map(
      ([code, kind, name, unit, , rt, rule, basis, labor, spec]) =>
        `  (${q(code)}, ${q(kind)}, ${q(name)}, ${q(spec ?? '')}, ${q(unit)}, ${q(rt)}, ${j(rule)}, ${q(basis)}, '샘플 품목', ${labor ? q(labor) : 'NULL'})`,
    ).join(',\n')}\nON CONFLICT (code) DO NOTHING;`,
  )
  out.push(
    `INSERT INTO est_item_price (item_code, price, effective_from, note, source)\nSELECT v.code, v.price, DATE '2026-10-01', '샘플', 'manual' FROM (VALUES\n${SAMPLE_ITEMS.map(([code, , , , price]) => `  (${q(code)}, ${price})`).join(',\n')}\n) AS v(code, price)\nWHERE NOT EXISTS (SELECT 1 FROM est_item_price p WHERE p.item_code = v.code);`,
  )

  out.push('\n-- 실단가 관측(샘플)·노무 실단가(샘플)')
  out.push(
    `INSERT INTO est_actual_cost (item_code, source, unit_price, observed_on, note)\nSELECT v.code, v.source, v.price, v.on_date::date, '샘플' FROM (VALUES\n${ACTUALS.flatMap(([code, src, obs]) => obs.map(([p, d]) => `  (${q(code)}, ${q(src)}, ${p}, ${q(d)})`)).join(',\n')}\n) AS v(code, source, price, on_date)\nWHERE NOT EXISTS (SELECT 1 FROM est_actual_cost WHERE note = '샘플');`,
  )
  out.push(`INSERT INTO est_labor_rate (labor_class, item_code, day_rate, overtime_factor, night_factor, effective_from, note)
SELECT v.cls, NULL, v.rate, 1.5, 1.5, DATE '2026-10-01', '샘플' FROM (VALUES ('our_staff', 250000), ('daily', 200000), ('partner', 280000)) AS v(cls, rate)
WHERE NOT EXISTS (SELECT 1 FROM est_labor_rate WHERE note = '샘플');`)

  out.push('\n-- 템플릿')
  for (const t of TEMPLATES) {
    out.push(
      `INSERT INTO est_template (class2_id, name, version, rate_set_id, note) VALUES ((SELECT id FROM est_class WHERE code = ${q(t.class2)}), ${q(t.name)}, 1, (SELECT id FROM est_rate_set WHERE code = ${q(t.rate)}), '샘플') ON CONFLICT (class2_id, version) DO NOTHING;`,
    )
    out.push(
      `INSERT INTO est_template_item (template_id, class3_id, item_code, grade, condition, remove_if, sort_order)\nSELECT t.id, (SELECT id FROM est_class WHERE code = v.c3), v.item, v.grade, v.cond::jsonb, v.rm::jsonb, v.sort FROM (VALUES\n${t.items
        .map(([item, grade, c3, cond, rm], i) => `  (${q(item)}, ${q(grade)}, ${q(c3)}, ${cond ? q(JSON.stringify(cond)) : 'NULL'}, ${rm ? q(JSON.stringify(rm)) : 'NULL'}, ${(i + 1) * 10})`)
        .join(',\n')}\n) AS v(item, grade, c3, cond, rm, sort)\nCROSS JOIN (SELECT id FROM est_template WHERE class2_id = (SELECT id FROM est_class WHERE code = ${q(t.class2)}) AND version = 1) t\nON CONFLICT (template_id, item_code) DO NOTHING;`,
    )
  }

  out.push('\n-- 규칙표(전 사업 공통)')
  out.push(
    `INSERT INTO est_rule (code, class1_id, name, condition, action, message, severity, sort_order) VALUES\n${RULES.map(
      ([code, name, cond, action, msg, sev, sort]) => `  (${q(code)}, NULL, ${q(name)}, ${j(cond)}, ${j(action)}, ${q(msg)}, ${q(sev)}, ${sort})`,
    ).join(',\n')}\nON CONFLICT (code) DO NOTHING;`,
  )

  out.push('\n-- 샘플 발주처·샘플 프로젝트 2건 (기존 금강변압기 줄은 건드리지 않음)')
  out.push(`INSERT INTO clients (name, site_address, memo) SELECT '샘플 발주처', '경기도 평택시 샘플산업단지 1', '견적 시스템 샘플' WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = '샘플 발주처');`)
  const proj = (num: string, title: string, c1: string, c2: string, stage: string, addr: string, inquiry: string, visits: number) =>
    `INSERT INTO est_project (number, title, client_id, client_type, site_address, inquiry_text, class1_id, class2_id, stage, manager_visits_planned, site_summary, created_by)
VALUES (${q(num)}, ${q(title)}, (SELECT min(id) FROM clients WHERE name = '샘플 발주처'), 'company', ${q(addr)}, ${q(inquiry)},
  (SELECT id FROM est_class WHERE code = ${q(c1)}), (SELECT id FROM est_class WHERE code = ${q(c2)}), ${q(stage)}, ${visits}, '샘플 프로젝트', 'system')
ON CONFLICT (number) DO NOTHING;`
  out.push(proj('NM-2610-S01', '샘플·공장 변압기 이동 안착', 'L1-HEAVY', 'L2-HEAVY-MOVE', 'P3', '경기도 평택시 샘플산업단지 1 2동', '변압기 1기를 2동 기초 위로 옮겨 안착하고 싶음', 3))
  out.push(proj('NM-2610-S02', '샘플·지하 배관 누수 복구', 'L1-LEAK', 'L2-LEAK-PIPE', 'P2', '경기도 평택시 샘플산업단지 1 지하 기계실', '지하 기계실 천장에서 물이 샘. 보험 처리 예정', 1))
  const answers = (num: string, a: Record<string, unknown>) =>
    `INSERT INTO est_check_answer (project_id, question_id, value, answered_by)\nSELECT p.id, qn.id, v.val::jsonb, 'system' FROM (VALUES\n${Object.entries(a)
      .map(([k, v]) => `  (${q(k)}, ${q(JSON.stringify(v))})`)
      .join(',\n')}\n) AS v(code, val)\nJOIN est_check_question qn ON qn.code = v.code\nCROSS JOIN (SELECT id FROM est_project WHERE number = ${q(num)}) p\nON CONFLICT (project_id, question_id) DO NOTHING;`
  out.push(answers('NM-2610-S01', S01_ANSWERS))
  out.push(answers('NM-2610-S02', S02_ANSWERS))
  out.push(`-- S01 의 A안 초안은 앱이 처음 열릴 때 같은 엔진(lib/est/draft.ts)으로 만듦(est_seed 'sample_draft_s01')`)
  return out.join('\n') + '\n'
}

export const SAMPLE_DRAFT_PROJECT = 'NM-2610-S01'
export const SAMPLE_DRAFT_KEY = 'sample_draft_s01'
