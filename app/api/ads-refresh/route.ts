import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const OWNER = 'kdolbae'
const REPO = 'nanomaster-ads'
const WORKFLOW = 'daily.yml'

/**
 * 광고 상황판을 지금 갱신합니다 (관리자 전용).
 *
 * 성과 수집은 이 사이트가 아니라 `kdolbae/nanomaster-ads` 의 워크플로가 합니다.
 * 여기서는 그 워크플로를 부르기만 합니다. 워크플로는 두 브랜드를 차례로 돌리고,
 * 키가 없는 브랜드는 건너뜁니다 — 엔엠솔루션만 따로 부를 필요가 없습니다.
 *
 * 토큰은 **서버에서만** 씁니다. `ADS_BOARD_TOKEN` 은 `NEXT_PUBLIC_` 이 아닙니다.
 * 워크플로는 1~2분 걸리고, 끝나야 상황판 주소의 내용이 바뀝니다.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return json({ ok: false, message: '로그인이 필요합니다.' }, 401)

  const token = process.env.ADS_BOARD_TOKEN
  if (!token) {
    return json(
      {
        ok: false,
        message:
          '갱신 토큰이 설정되지 않았습니다. Vercel 환경변수에 ADS_BOARD_TOKEN 을 넣어 주세요. 그때까지는 매일 아침 자동 수집만 됩니다.',
      },
      503,
    )
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    })
    if (res.status === 204) {
      return json({ ok: true, message: '갱신을 시작했습니다. 1~2분 뒤 상황판을 새로고침하세요.' })
    }
    // 본문에 토큰은 들어 있지 않지만, 그대로 흘리지 않고 상태 코드만 전한다.
    console.error('[ads-refresh] 워크플로 호출 실패', res.status, await res.text().catch(() => ''))
    const hint =
      res.status === 401 || res.status === 403
        ? '토큰의 권한을 확인해 주세요 (actions: write).'
        : res.status === 404
          ? '워크플로를 찾지 못했습니다. 토큰이 해당 저장소에 접근할 수 있는지 확인해 주세요.'
          : '잠시 후 다시 시도해 주세요.'
    return json({ ok: false, message: `갱신을 시작하지 못했습니다 (${res.status}). ${hint}` }, 502)
  } catch (e) {
    console.error('[ads-refresh] 워크플로 호출 오류', e)
    return json({ ok: false, message: '갱신 요청 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.' }, 502)
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}
