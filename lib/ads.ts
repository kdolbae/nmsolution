/**
 * 광고 운영 정보.
 *
 * 상황판 HTML 자체는 이 저장소가 만들지 않는다. `kdolbae/nanomaster-ads` 의
 * 매일 아침 워크플로가 네이버 검색광고 API 에서 성과를 받아 정적 페이지로 굽고
 * GitHub Pages 에 올린다. 여기서는 그 주소를 끼워 보여 주기만 한다.
 *
 * 나노마스터와 엔엠솔루션은 광고계정이 아예 달라 상황판도 주소가 갈린다
 * (도구에서 `--brand nmsolution`).
 */

const DASHBOARD_BASE = 'https://kdolbae.github.io/nanomaster-ads-site'

export const ADS = {
  /** 엔엠솔루션 상황판. 수집 이력이 쌓이기 전에는 빈 표로 나온다. */
  dashboardUrl: process.env.ADS_DASHBOARD_URL || `${DASHBOARD_BASE}/nmsolution/`,
  /** 나노마스터 상황판 (같은 도구, 다른 계정) */
  nanomasterDashboardUrl: `${DASHBOARD_BASE}/`,
  /** 네이버 검색광고 관리 화면 */
  naverSearchAdUrl: 'https://searchad.naver.com/',
  /** 수집·상황판 갱신을 손으로 돌리는 곳 */
  workflowUrl: 'https://github.com/kdolbae/nanomaster-ads/actions/workflows/daily.yml',
  /** 도구 저장소 */
  toolRepoUrl: 'https://github.com/kdolbae/nanomaster-ads',
  /** 상황판이 갱신되는 시각 (KST) */
  refreshedAt: '매일 06:35',
} as const

/** 광고로 들어온 문의인지. 빈 값과 `direct` 는 광고가 아니다. */
export function isPaid(source: string, medium: string): boolean {
  if (!source || source === 'direct') return false
  return medium === 'cpc' || medium === 'ppc' || medium === 'paid'
}
