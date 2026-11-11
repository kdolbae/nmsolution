/**
 * 우측 하단 간단 문의(3문답): 어떤 작업 → 위치(시·군) → 연락처, 사진은 선택.
 * 실시간 채팅처럼 보이면 바로 답이 와야 한다고 기대하므로 회신 시간을 꼭 같이 보여준다.
 */
export const QUICK_WORKS = ['탱크', '배관', '가설건축', '공압', '기타'] as const

/** 자주 오는 시·군. 목록에 없으면 손님이 직접 적는다 */
export const QUICK_AREAS = ['평택', '안성', '화성', '오산', '용인', '이천', '천안', '아산'] as const

export const QUICK_REPLY_NOTE = '회신은 업무시간(평일 09–18시) 내 1시간 이내에 드립니다.'

/** 간단 문의에 붙일 수 있는 현장 사진 수 */
export const QUICK_MAX_PHOTOS = 3

/** quote_requests.form 값 → 화면 이름. 이 열이 생기기 전 문의는 비어 있다 */
export const FORM_LABELS: Record<string, string> = {
  quick: '간단 문의',
  form: '견적 폼',
  photo: '사진 견적',
}

export function formLabel(form: string | null | undefined): string {
  const f = (form ?? '').trim()
  return f ? (FORM_LABELS[f] ?? f) : '이전 기록'
}
