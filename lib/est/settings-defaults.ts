/**
 * 견적 시스템의 모든 기준값(est_setting). 여기 값은 전부 "샘플" 기본값이며 kevin 이 /admin/est/settings 에서 고침.
 * sql/016_est_seed_sample.sql 의 설정 INSERT 도 이 표로 만듦(scripts/est-sql.ts). DB 에 없는 키는 이 값을 씀.
 */

export type SettingDef = { key: string; group: string; label: string; value: unknown; help?: string }

export const SETTING_GROUPS = ['담당자', '인센티브', '결재', '이익', '요율', '문서', '현장', '화면', 'SSO', '본사'] as const

export const SETTING_DEFAULTS: SettingDef[] = [
  { key: 'manager.day_rate_customer', group: '담당자', label: '담당자 1일 단가(고객 서류)', value: 350000, help: '고객 서류 "현장 조사 및 공사 관리" 1회 단가(원)' },
  { key: 'manager.day_rate_internal', group: '담당자', label: '담당자 1일 원가(내부)', value: 300000, help: '예상·최종이익 계산용 내부 원가(원). 고객 서류에 나가지 않음' },
  { key: 'manager.cost_kind', group: '담당자', label: '담당자 줄 비목', value: '경비', help: '자재·용역·장비·노무·경비 중 하나. 보험료 산정에서 빼려면 경비' },
  { key: 'manager.line_name', group: '담당자', label: '담당자 줄 이름(고객용)', value: '현장 조사 및 공사 관리' },
  { key: 'manager.min_visits', group: '담당자', label: '담당자 최소 방문 수', value: 1, help: '이 미만이면 결재 올리기 불가' },
  { key: 'manager.item_code', group: '담당자', label: '담당자 품목 코드', value: 'MGR-SITE', help: '템플릿에서 이 품목은 담당자 줄로 바뀜' },

  { key: 'incentive.basis', group: '인센티브', label: '인센티브 기준', value: 'supply_pct', help: 'supply_pct(공급가 %) / final_profit_pct(인센티브 전 이익 %) / fixed_per_job(건당 고정)' },
  { key: 'incentive.pct', group: '인센티브', label: '인센티브 비율(%)', value: 3 },
  { key: 'incentive.fixed', group: '인센티브', label: '건당 고정 인센티브(원)', value: 300000, help: 'fixed_per_job 일 때만 씀' },
  { key: 'incentive.include_in_expected_cost', group: '인센티브', label: '예상원가에 인센티브 포함', value: true },

  { key: 'approval.ceo_threshold_supply', group: '결재', label: '대표 결재 기준 공급가(원)', value: 30000000, help: '공급가가 이 미만이면 검토자가 최종 승인' },
  { key: 'approval.steps', group: '결재', label: '결재 단계 순서', value: ['writer', 'reviewer', 'ceo'], help: 'writer·reviewer·ceo 중에서 순서대로' },
  { key: 'approval.reviewer_role', group: '결재', label: '검토 단계 역할', value: 'reviewer' },
  { key: 'approval.ceo_self_skip_review', group: '결재', label: '대표가 올린 판은 검토 생략', value: true, help: '대표가 직접 올리면 검토자 단계를 건너뛰고 대표 확인으로 승인' },
  { key: 'approval.bridge', group: '결재', label: '결재 처리 위치', value: 'local', help: 'local(이 앱 안) / sbworks(2단계: SBworks 결재로 넘김)' },

  { key: 'profit.min_margin_pct', group: '이익', label: '최소 예상이익률(%)', value: 12 },
  { key: 'profit.min_margin_severity', group: '이익', label: '최소 이익률 미달 심각도', value: 'warn', help: 'warn / error' },
  { key: 'actual.window_count', group: '이익', label: '실단가 범위에 쓰는 최근 관측 수', value: 10 },
  { key: 'actual.typ_method', group: '이익', label: '실단가 대표값', value: 'last', help: 'last(최근값) / median(중앙값)' },
  { key: 'variance.highlight_pct', group: '이익', label: '단가 차이 표시 기준(%)', value: 10, help: '견적단가와 실단가 차이가 이 % 이상이면 표시·마스터 갱신 후보' },
  { key: 'cost.include_insurance', group: '이익', label: '법정 보험료를 원가에 포함', value: true },
  { key: 'cost.visible_roles', group: '화면', label: '실단가·원가 열을 보는 역할', value: ['reviewer', 'ceo'] },

  { key: 'rates.default', group: '요율', label: '기본 요율 세트 코드', value: 'NM_DEFAULT' },

  { key: 'doc.valid_days', group: '문서', label: '견적 유효기간(일)', value: 30 },
  { key: 'doc.number_prefix', group: '문서', label: '프로젝트 번호 접두', value: 'NM' },
  { key: 'doc.customer_style', group: '문서', label: '고객 출력물 스타일', value: { font: 'Pretendard', navy: '#0F2A44', orange: '#E8742A', tone: '~함' } },
  { key: 'doc.internal_words', group: '문서', label: '고객 문구 금지어', value: ['원가', '마진', '이익', '인센티브', '실단가', '메모'] },
  { key: 'doc.confirm_needed_text', group: '문서', label: '미확인 항목 고객 표기', value: '협의 후 확정' },

  { key: 'check.required_photos', group: '현장', label: '현장 확인 최소 사진 수', value: 3 },
  { key: 'check.block_without_photos', group: '현장', label: '사진 부족 시 다음 단계 막기', value: false },

  { key: 'profit.visible', group: '화면', label: '이익 보기 범위', value: { writer: 'pct', reviewer: 'amount', ceo: 'amount' }, help: '역할별 none / pct / amount' },
  { key: 'menu.modules', group: '화면', label: '앱 안 메뉴 모듈', value: { est: true, clients: true, quotes: true, site: true } },

  { key: 'sso.role_map', group: 'SSO', label: 'SBworks 역할 → 견적 역할', value: { owner: 'ceo', branch_manager: 'reviewer', staff: 'writer', sales: 'writer', technician: null, partner: null, viewer: null }, help: 'null = 들어올 수 없음. 표에 없는 역할은 writer' },
  { key: 'sso.session_hours', group: 'SSO', label: 'SSO 세션 시간(시간)', value: 12 },

  { key: 'hq.share_profit', group: '본사', label: '본사 요약에 이익률 포함', value: false },
]

export const SETTING_DEFAULT_MAP: Record<string, unknown> = Object.fromEntries(SETTING_DEFAULTS.map((d) => [d.key, d.value]))

export type Settings = Record<string, unknown>

/** 설정값 읽기 도우미(형이 다르면 기본값) */
export function sNum(s: Settings, key: string): number {
  const v = Number(s[key] ?? SETTING_DEFAULT_MAP[key])
  return Number.isFinite(v) ? v : Number(SETTING_DEFAULT_MAP[key] ?? 0)
}
export function sStr(s: Settings, key: string): string {
  const v = s[key] ?? SETTING_DEFAULT_MAP[key]
  return typeof v === 'string' ? v : String(SETTING_DEFAULT_MAP[key] ?? '')
}
export function sBool(s: Settings, key: string): boolean {
  const v = s[key] ?? SETTING_DEFAULT_MAP[key]
  return typeof v === 'boolean' ? v : v === 'true' || v === 1
}
export function sArr(s: Settings, key: string): string[] {
  const v = s[key] ?? SETTING_DEFAULT_MAP[key]
  return Array.isArray(v) ? v.map(String) : []
}
export function sObj<T extends Record<string, unknown>>(s: Settings, key: string): T {
  const v = s[key] ?? SETTING_DEFAULT_MAP[key]
  return (v && typeof v === 'object' && !Array.isArray(v) ? v : SETTING_DEFAULT_MAP[key]) as T
}
