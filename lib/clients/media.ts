/**
 * 업체별 현장 영상. 파일은 Cloudflare R2 버킷 nm-solution-media 에 두고, 관리자 업체 화면에서 바로 재생한다.
 * 키는 <업체 폴더>/<파일>.mp4 이며 공개 주소(R2_MEDIA_BASE) 아래에서 읽는다.
 * 원본 드론 영상은 kevin PC 에 있고, 구간만 잘라 1080p 로 올렸다 (2026-10-16).
 */

export type ClientVideo = {
  /** 버킷 안의 키 */
  key: string
  /** 화면에 보이는 설명 */
  label: string
}

export const R2_MEDIA_BASE = 'R2_MEDIA_BASE_PLACEHOLDER'

const VIDEOS: Record<string, ClientVideo[]> = {
  '신일공업(주)': [
    { key: 'sinil/roof-front.mp4', label: '전면 지붕' },
    { key: 'sinil/roof-rear-overall.mp4', label: '뒤에서 본 전체 지붕' },
  ],
}

export function clientVideos(clientName: string): { url: string; label: string }[] {
  return (VIDEOS[clientName] ?? []).map((v) => ({ url: `${R2_MEDIA_BASE}/${v.key}`, label: v.label }))
}
