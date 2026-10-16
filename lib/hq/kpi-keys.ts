/** 본사 요약 KPI 키(§10.1). 단가·원가·이익 금액은 넣지 않음. margin_pct 는 hq.share_profit 일 때만 숫자 */
export const HQ_KPI_KEYS = [
  'projects_open',
  'site_checks_pending',
  'estimates_in_approval',
  'estimates_submitted',
  'submitted_amount',
  'won_count',
  'won_amount',
  'lost_count',
  'exec_open',
  'settle_open',
  'receivable',
  'margin_pct',
] as const
export type HqKpis = Record<(typeof HQ_KPI_KEYS)[number], number | null>
