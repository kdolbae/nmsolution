/**
 * 광고 유입 판정.
 *
 * 상황판(광고비·노출·클릭·순위)은 이 사이트가 만들지 않는다. 2026-09-30 부터 나노마스터
 * 관리 화면의 같은 상황판(`?brand=nmsolution`)으로 본다 (`lib/board-urls.ts`).
 * 여기 남은 것은 "이 문의가 광고로 들어온 것인지" 판정뿐이다.
 */

/** 광고로 들어온 문의인지. 빈 값과 `direct` 는 광고가 아니다. */
export function isPaid(source: string, medium: string): boolean {
  if (!source || source === 'direct') return false
  return medium === 'cpc' || medium === 'ppc' || medium === 'paid'
}
