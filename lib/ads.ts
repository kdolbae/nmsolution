/**
 * 광고 유입 판정.
 *
 * 상황판 HTML 자체는 이 저장소가 만들지 않는다. `kdolbae/nanomaster-ads` 의 매일 아침
 * 워크플로가 네이버 검색광고 API 에서 성과를 받아 `reports/nmsolution/dashboard.html` 로
 * 구워 두고, 그 저장소는 광고비·입찰가가 들어 있어 비공개라 `/api/admin/ads-board` 가
 * 토큰으로 읽어 로그인한 관리자에게만 넘긴다. 그래서 여기에 상황판 주소를 두지 않는다.
 */

/** 광고로 들어온 문의인지. 빈 값과 `direct` 는 광고가 아니다. */
export function isPaid(source: string, medium: string): boolean {
  if (!source || source === 'direct') return false
  return medium === 'cpc' || medium === 'ppc' || medium === 'paid'
}
