import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * 검색광고 상황판 원본 — 관리자만. 나노마스터(nanomaster.co.kr/admin/ads)와 같은 방식이다.
 *
 * 광고 도구(kdolbae/nanomaster-ads)가 매일 네이버 광고 성과를 모아 reports/nmsolution/dashboard.html 을
 * 만들어 커밋한다. 그 저장소는 비공개(광고비·입찰가가 들어 있다)라 토큰으로 읽어 로그인한 관리자에게만 넘긴다.
 *
 * 환경변수 (Vercel → Settings → Environment Variables):
 *   ADS_BOARD_TOKEN  kdolbae/nanomaster-ads 읽기 전용 GitHub 토큰 (fine-grained, Contents: Read-only)
 *   ADS_BOARD_REPO   (선택) 기본 kdolbae/nanomaster-ads
 *   ADS_BOARD_PATH   (선택) 기본 reports/nmsolution/dashboard.html
 */
const page = (body: string, status: number) =>
  new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">` +
      `<style>body{font-family:system-ui,sans-serif;margin:0;padding:40px;line-height:1.7;color:#14213c}</style></head>` +
      `<body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } },
  )

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return page('로그인이 필요합니다.', 401)

  const token = process.env.ADS_BOARD_TOKEN
  if (!token) {
    return page(
      '<b>검색광고 상황판을 연결하려면 설정이 하나 필요합니다.</b><br>' +
        'Vercel 프로젝트 → Settings → Environment Variables 에 <code>ADS_BOARD_TOKEN</code> 을 넣고 다시 배포해 주세요.<br>' +
        '값은 GitHub 의 fine-grained 토큰입니다 (Repository access: kdolbae/nanomaster-ads, Contents: Read-only).<br>' +
        '나노마스터 사이트의 검색광고 상황판에 쓰는 토큰과 같은 것을 써도 됩니다.',
      200,
    )
  }
  const repo = process.env.ADS_BOARD_REPO || 'kdolbae/nanomaster-ads'
  const path = process.env.ADS_BOARD_PATH || 'reports/nmsolution/dashboard.html'
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'nm-solution-admin' },
    cache: 'no-store',
  }).catch(() => null)
  if (!r || !r.ok) {
    return page(`상황판 파일을 읽지 못했습니다 (${r ? r.status : '연결 실패'}). 토큰 권한과 저장소 이름을 확인해 주세요.`, 502)
  }
  return new Response(await r.text(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
