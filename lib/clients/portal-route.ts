import { logoSvg } from '@/lib/brand-logo'
import { PRETENDARD_CSS, QUOTE_CSS, renderQuote } from './quote'
import { quoteSummaryHtml } from './quote-summary'
import { esc, withBrandLogo } from './proposal'
import { getClientBySlug } from './table'
import { PORTAL_MAX_AGE, hasPortalAccess, portalCookieName, portalToken, readCookie } from './portal'
import { verifyPortalPassword } from './portal-password'

/**
 * 업체용 링크 (예: app/sinil/route.ts → nm-solution.co.kr/sinil).
 *
 * - 업체 아이디·비밀번호(관리자 업체 정보에서 정함)로 들어온다. 통과하면 7일 동안 기억한다.
 * - 본문은 업체의 제안서 탭 HTML이고, <!--NM:QUOTE--> 자리에 지금 견적서를 엔엠솔루션 양식으로 넣는다.
 *   <!--NM:QUOTE-SUMMARY--> 가 있으면 그 자리에 금액 요약 카드를 따로 넣는다(없으면 견적서 위에 붙임).
 * - 사진은 /client-assets/<주소>/ 에 두고 proxy.ts 가 같은 쿠키를 확인한다.
 */

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
}

function loginPage(title: string, error: boolean): Response {
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>로그인 | 엔엠솔루션</title>
<style>
:root{--navy:#0e1b3d;--electric:#2c5ce6;--line:#e2e5ea;--muted:#6b7280}
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f4f5f7;color:#1b1f27;
font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;padding:20px}
form{width:100%;max-width:360px;background:#fff;border:1px solid var(--line);border-radius:4px;padding:28px 24px}
.mark{height:30px}
h1{font-size:20px;font-weight:900;color:var(--navy);margin:16px 0 6px;letter-spacing:-.02em}p{margin:0 0 18px;color:var(--muted);font-size:14px;line-height:1.6}
label{display:block;font-size:13px;font-weight:700;margin:12px 0 6px}
input{width:100%;font:inherit;font-size:16px;padding:11px 14px;border:1px solid var(--line);border-radius:4px}
input:focus{outline:2px solid var(--electric);outline-offset:-1px;border-color:transparent}
button{width:100%;margin-top:16px;font:inherit;font-weight:700;font-size:15px;padding:12px;border:0;border-radius:4px;background:var(--navy);color:#fff;cursor:pointer}
.err{color:#c8372d;font-size:13px;margin:10px 0 0}
</style></head><body>
<form method="post">
<div class="mark">${logoSvg('horizontal', { height: '100%' })}</div>
<h1>${esc(title)}</h1>
<p>엔엠솔루션이 제출한 공사 자료임. 전달받은 아이디와 비밀번호를 입력해야 열람할 수 있음.</p>
<label for="u">아이디</label>
<input id="u" name="login" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required autofocus>
<label for="p">비밀번호</label>
<input id="p" name="password" type="password" autocomplete="current-password" required>
${error ? '<div class="err" role="alert">아이디 또는 비밀번호가 맞지 않음.</div>' : ''}
<button type="submit">열기</button>
</form></body></html>`
  return new Response(html, { status: error ? 401 : 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } })
}

function notFound() {
  return new Response('Not Found', { status: 404, headers: NO_STORE })
}

export async function portalGet(req: Request, slug: string): Promise<Response> {
  const client = await getClientBySlug(slug)
  if (!client) return notFound()
  if (!(await hasPortalAccess(slug, readCookie(req, portalCookieName(slug))))) return loginPage(`${client.name} 공사 자료`, false)

  const summary = quoteSummaryHtml(client.quote)
  const sheet = `<div class="quote-sheet">${renderQuote(client.quote, client)}</div>`
  const hasSummarySlot = client.proposalHtml.includes('<!--NM:QUOTE-SUMMARY-->')

  let html = withBrandLogo(client.proposalHtml)
    .split('{{QUOTE_NO}}')
    .join(esc(client.quote.number))
    .replace('<!--NM:QUOTE-SUMMARY-->', () => summary)
    .replace('<!--NM:QUOTE-->', () => (hasSummarySlot ? sheet : summary + sheet))
  const head = `<link rel="stylesheet" href="${PRETENDARD_CSS}"><style>${QUOTE_CSS}</style>`
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => `${head}</head>`) : head + html
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } })
}

export async function portalPost(req: Request, slug: string): Promise<Response> {
  const client = await getClientBySlug(slug)
  if (!client) return notFound()
  const form = await req.formData().catch(() => null)
  const login = String(form?.get('login') ?? '').trim().toLowerCase()
  const password = String(form?.get('password') ?? '')
  const ok =
    !!client.portalLogin &&
    login === client.portalLogin.toLowerCase() &&
    (await verifyPortalPassword(password, client.portalPasswordHash))
  const token = ok ? await portalToken(slug) : null
  if (!token) {
    // 비밀번호가 짧을 수 있어 연속 대입을 늦춘다
    await new Promise((r) => setTimeout(r, 1500))
    return loginPage(`${client.name} 공사 자료`, true)
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/${slug}`,
      'Set-Cookie': `${portalCookieName(slug)}=${token}; Path=/; Max-Age=${PORTAL_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      ...NO_STORE,
    },
  })
}
