'use client'

/**
 * SBworks 광고도구 "랜딩페이지 미리보기"(?sbpreview=1&sbtk=토큰)로 연 화면인지.
 * 미리보기면 방문·전환 기록(site-events)·Vercel Analytics·메타 픽셀·네이버 로그를 하나도 보내지 않는다.
 * 표식은 탭(sessionStorage sb.preview)에 남아 미리보기 안에서 다른 페이지로 옮겨 가도 계속 미리보기다.
 * 토큰이 없거나 틀려도 기록은 안 남기고, 위 띠 글자만 "확인 안 된 미리보기"로 바뀐다(토큰 확인은 SBworks /api/public/preview).
 */
export function previewToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const q = new URLSearchParams(location.search)
    if (q.has('sbpreview')) {
      const tk = q.get('sbtk') || ''
      sessionStorage.setItem('sb.preview', tk || '-')
      return tk
    }
    const s = sessionStorage.getItem('sb.preview')
    return s === null ? null : s === '-' ? '' : s
  } catch {
    return location.search.includes('sbpreview=') ? '' : null
  }
}

export const isPreview = () => previewToken() !== null
