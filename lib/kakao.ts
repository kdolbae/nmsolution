/**
 * 카카오톡 채널 1:1 채팅을 팝업 창으로 엽니다.
 * 팝업이 차단되거나(주로 iframe 환경) 실패하면 새 탭으로 대체합니다.
 */
export function openKakaoChat(url: string) {
  if (!url) return
  if (typeof window === 'undefined') return

  const w = 420
  const h = 680
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2)
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2)

  const popup = window.open(
    url,
    'nm-kakao-chat',
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  )

  // 팝업 차단 시 새 탭으로 대체
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * 관리자에 입력된 카카오톡 채널 주소를 1:1 채팅 주소로 정리한다.
 *
 * 채널 홈(.../_ABCDE)을 넣어도, 채팅 주소(.../_ABCDE/chat)를 넣어도,
 * 끝에 슬래시가 붙어 있어도 같은 결과가 나온다. 비어 있으면 빈 문자열.
 */
export function kakaoChatUrl(url: string): string {
  const clean = (url ?? '').trim().replace(/\/+$/, '')
  if (!clean) return ''
  return `${clean.replace(/\/chat$/, '')}/chat`
}
