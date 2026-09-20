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
 * 카카오톡 채널 주소에서 두 종류의 링크를 만든다.
 *
 * - home: 채널 홈. 채널 추가와 소식 확인용.
 * - chat: 1:1 채팅(비즈니스 채팅). 바로 문의용.
 *
 * 관리자에 채널 홈(.../_ABCDE)이나 채팅 주소(.../_ABCDE/chat) 중
 * 어느 쪽을 넣어도 두 링크가 모두 정상으로 나온다.
 */
export function kakaoLinks(url: string): { home: string; chat: string } {
  const clean = (url ?? '').trim().replace(/\/+$/, '')
  if (!clean) return { home: '', chat: '' }
  const home = clean.replace(/\/chat$/, '')
  return { home, chat: `${home}/chat` }
}
