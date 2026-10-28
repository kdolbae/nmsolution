import { KKT_COOKIE, KKT_COOKIE_MAX_AGE, hasKktAccess, isKktPassword, kktToken } from '@/lib/kkt-access'
import { PAGE_HTML } from './page-html'
import { NO_STORE, cookieValue } from './http'
import { logoSvg } from '@/lib/brand-logo'
import { withBrandLogo } from '@/lib/clients/proposal'
import { logAccess, trackedHtml, trackerTag } from '@/lib/clients/access-log'
import { after } from 'next/server'

/**
 * 금강변압기 공사제안서 페이지 (대표 주소 /kkt). 예전 /금강변압기 링크는 proxy.ts 가 여기로 넘긴다.
 *
 * - 링크를 아는 사람도 비밀번호(KKT_PASSWORD)를 넣어야 볼 수 있다. 관리자도 같다.
 * - 본문에는 금액이 없다. 견적서는 맨 아래 칸에서 같은 비밀번호를 열 때마다 다시 넣어야
 *   ./quote/route.ts 가 내려준다.
 * - 본문은 /mnt/project-files/kkt-web/build.py 가 만든 page-html.ts 를 그대로 내보낸다.
 */

export const dynamic = 'force-dynamic'

function lockPage(error: boolean, viewId?: string): Response {
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>비밀번호 입력 | 엔엠솔루션</title>
<style>
:root{--navy:#0e1b3d;--electric:#2c5ce6;--line:#e2e5ea;--muted:#6b7280}
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f4f5f7;color:#1b1f27;
font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;padding:20px}
form{width:100%;max-width:360px;background:#fff;border:1px solid var(--line);border-radius:4px;padding:28px 24px}
.mark{height:30px}
h1{font-size:20px;font-weight:900;color:var(--navy);margin:16px 0 6px;letter-spacing:-.02em}p{margin:0 0 18px;color:var(--muted);font-size:14px;line-height:1.6}
input{width:100%;font:inherit;font-size:18px;letter-spacing:.3em;padding:12px 14px;border:1px solid var(--line);border-radius:4px;text-align:center}
input:focus{outline:2px solid var(--electric);outline-offset:-1px;border-color:transparent}
button{width:100%;margin-top:12px;font:inherit;font-weight:700;font-size:15px;padding:12px;border:0;border-radius:4px;background:var(--navy);color:#fff;cursor:pointer}
.err{color:#c8372d;font-size:13px;margin:10px 0 0}
</style></head><body>
<form method="post">
<div class="mark">${logoSvg('horizontal', { height: '100%' })}</div>
<h1>금강변압기 공사제안서</h1>
<p>엔엠솔루션이 주식회사 금강변압기에 제출한 공사제안서임. 전달받은 비밀번호를 입력해야 열람할 수 있음.</p>
<input name="password" type="password" inputmode="numeric" autocomplete="off" autofocus required aria-label="비밀번호">
${error ? '<div class="err" role="alert">비밀번호가 맞지 않음.</div>' : ''}
<button type="submit">열기</button>
</form>${viewId ? trackerTag(viewId) : ''}</body></html>`
  return new Response(html, {
    status: error ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE },
  })
}

export async function GET(req: Request) {
  if (!(await hasKktAccess(cookieValue(req)))) {
    const viewId = crypto.randomUUID()
    after(() => logAccess(req.headers, null, 'login_page', { slug: 'kkt', viewId }))
    return lockPage(false, viewId)
  }
  return new Response(trackedHtml(withBrandLogo(PAGE_HTML), req.headers, 'kkt'), { headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } })
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const input = String(form?.get('password') ?? '')
  const ok = await isKktPassword(input)
  const viewId = ok ? undefined : crypto.randomUUID()
  after(() => logAccess(req.headers, null, ok ? 'login_ok' : 'login_fail', { slug: 'kkt', viewId }))
  if (!ok) {
    // 네 자리 비밀번호라 연속 대입을 늦춘다
    await new Promise((r) => setTimeout(r, 1500))
    return lockPage(true, viewId)
  }
  const token = (await kktToken())!
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/kkt',
      'Set-Cookie': `${KKT_COOKIE}=${token}; Path=/; Max-Age=${KKT_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      ...NO_STORE,
    },
  })
}
