import { KKT_COOKIE, KKT_COOKIE_MAX_AGE, hasKktAccess, isKktPassword, kktToken } from '@/lib/kkt-access'
import { NO_STORE, cookieValue } from './http'
import { logoSvg } from '@/lib/brand-logo'
import { logAccess, trackedHtml, trackerTag } from '@/lib/clients/access-log'
import { portalPageHtml } from '@/lib/clients/portal-route'
import { latestSend } from '@/lib/clients/sends'
import { getClient } from '@/lib/clients/table'
import { KKT_CLIENT, KKT_QUOTE_1019 } from '@/lib/clients/seed-kkt'
import { htmlToPdf, pdfResponse } from '@/lib/clients/pdf'
import { pool } from '@/lib/db'
import { after } from 'next/server'

/**
 * 금강변압기 업체 링크 (대표 주소 /kkt). 예전 /금강변압기 링크는 proxy.ts 가 여기로 넘긴다.
 *
 * - 링크를 아는 사람도 비밀번호(KKT_PASSWORD)를 넣어야 볼 수 있다. 관리자도 같다.
 * - 2026-10-30 kevin(고객 급요청): 작업계획서는 다시 정비할 때까지 내리고 견적서만 보여 준다.
 *   견적서는 어드민에서 '고객 발송본으로 확정'한 최신 발송본(없으면 10/19 최종안). ?pdf=1 은 그 PDF.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  const view = await quoteOnly()
  if (new URL(req.url).searchParams.get('pdf') === '1') {
    after(() => logAccess(req.headers, view.client, 'pdf', { slug: 'kkt', details: view.details }))
    return pdfResponse(await htmlToPdf(view.html, req), `${KKT_CLIENT.name} 견적서 ${view.number}.pdf`)
  }
  return new Response(trackedHtml(view.html, req.headers, 'kkt', { client: view.client, details: view.details }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE },
  })
}

/** 견적서만 있는 업체 페이지(금액 요약 카드 + 견적서 + PDF 다운로드). 다른 업체 페이지와 같은 portalPageHtml 로 만든다 */
async function quoteOnly() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
  const client = rows[0] ? await getClient(Number(rows[0].id)) : null
  if (!client) throw new Error('금강변압기 업체를 찾지 못했습니다.')
  const send = await latestSend(client.id)
  const quote = send?.quote ?? KKT_QUOTE_1019
  const html = portalPageHtml({ ...client, portalPasswordHash: '', shareHash: '', shareExpires: null }, { no: send?.no ?? 0, proposalHtml: QUOTE_SHELL, quote })
  return { html, client, number: quote.number, details: { send: send?.number ?? null, quoteOnly: true } }
}

const QUOTE_SHELL = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>${KKT_CLIENT.name} 견적서 | 엔엠솔루션</title>
<style>body{margin:0;background:#f4f6f9;color:#1d2430;font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
main{max-width:900px;margin:0 auto;padding:24px 16px 96px}
.quote-sheet{background:#fff;border:1px solid #dde3ea;padding:28px 24px;margin-top:16px;overflow-x:auto}
h1{font-size:22px;font-weight:700;color:#0f2a44;margin:0 0 4px;letter-spacing:-.02em}main>p{margin:0 0 16px;color:#5d6878;font-size:14px}
.qsum{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.qcard{background:#fff;border:1px solid #dde3ea;padding:14px 16px}.qcard.main{border-color:#0f2a44}
.qcard .l{font-size:13px;color:#5d6878}.qcard .v{font-size:24px;font-weight:700;color:#0f2a44;margin:2px 0;font-variant-numeric:tabular-nums}.qcard .s{font-size:12.5px;color:#5d6878}
@media print{body{background:#fff}main{padding:0}.quote-sheet{border:0;padding:0;margin:0}}</style>
</head><body><main><h1>${KKT_CLIENT.name} 견적서</h1><p>엔엠솔루션이 제출하는 견적서임. 오른쪽 아래 버튼으로 PDF를 내려받을 수 있음.</p><!--NM:QUOTE--></main></body></html>`

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
