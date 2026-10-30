import { logoSvg } from '@/lib/brand-logo'
import { PRETENDARD_CSS, QUOTE_CSS, renderQuote } from './quote'
import { quoteSummaryHtml } from './quote-summary'
import { esc, withBrandLogo } from './proposal'
import { getClientBySlug } from './table'
import { PORTAL_MAX_AGE, hasPortalAccess, portalCookieName, portalToken, readCookie, validShareKey } from './portal'
import { verifyPortalPassword } from './portal-password'
import { htmlToPdf, pdfResponse } from './pdf'
import { logAccess, trackedHtml, trackerTag } from './access-log'
import { customerSends, getSend, type listSends, type Send } from './sends'
import { historyBar, notReadyHtml } from './send-compare'
import { after } from 'next/server'

/**
 * 업체용 링크 (예: app/sinil/route.ts → nm-solution.co.kr/sinil).
 *
 * - 견적 제출용 링크라 비밀번호(관리자 업체 정보에서 정함)만 넣으면 들어온다. 통과하면 7일 동안 기억한다.
 *   계약서·공정표처럼 아이디가 필요한 자료는 협력업체 포털(/portal)에서 따로 본다.
 * - 본문은 업체의 제안서 탭 HTML이고, <!--NM:QUOTE--> 자리에 지금 견적서를 엔엠솔루션 양식으로 넣는다.
 *   <!--NM:QUOTE-SUMMARY--> 가 있으면 그 자리에 금액 요약 카드를 따로 넣는다(없으면 견적서 위에 붙임).
 * - 사진은 /client-assets/<주소>/ 에 두고 proxy.ts 가 같은 쿠키를 확인한다.
 * - 제안서·견적서는 고객 발송본(lib/clients/sends.ts)에서만 읽는다. 내부 작업 버전은 어떤 주소로도 열리지 않는다.
 *   ?s=N 지난 발송본, ?s=N&pdf=1 그 PDF(발송본끼리 비교는 어드민에서만). 발송본이 없으면 '준비 중' 화면만 보인다.
 */

const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
}

/** viewId 를 주면 로그인 화면에도 행동 기록 스크립트를 넣는다(사람이 실제로 화면을 띄웠는지, 비밀번호를 쳤는지 남김) */
function loginPage(title: string, error: boolean, viewId?: string): Response {
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
<p>엔엠솔루션이 제출한 공사 자료임. 전달받은 비밀번호를 입력해야 열람할 수 있음.</p>
<label for="p">비밀번호</label>
<input id="p" name="password" type="password" inputmode="text" autocomplete="current-password" required autofocus>
${error ? '<div class="err" role="alert">비밀번호가 맞지 않음.</div>' : ''}
<button type="submit">열기</button>
</form>${viewId ? trackerTag(viewId) : ''}</body></html>`
  return new Response(html, { status: error ? 401 : 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } })
}

function notFound() {
  return new Response('Not Found', { status: 404, headers: NO_STORE })
}

export async function portalGet(req: Request, slug: string): Promise<Response> {
  const client = await getClientBySlug(slug)
  if (!client) return notFound()
  const params = new URL(req.url).searchParams
  // 임시 링크(?k=)면 로그인 없이 열고, 사진도 보이도록 남은 기간만큼 쿠키를 준다
  const shareLeft = await validShareKey(slug, params.get('k'), client.shareHash, client.shareExpires)
  const shareToken = shareLeft ? await portalToken(slug) : null
  // 접속 기록(lib/clients/access-log.ts)은 응답 뒤에 남겨 업체 화면을 늦추지 않는다
  if (!shareToken && !(await hasPortalAccess(slug, readCookie(req, portalCookieName(slug))))) {
    const viewId = crypto.randomUUID()
    after(() => logAccess(req.headers, client, 'login_page', { slug, viewId }))
    return loginPage(`${client.name} 공사 자료`, false, viewId)
  }
  const headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE }
  if (shareToken) headers['Set-Cookie'] = `${portalCookieName(slug)}=${shareToken}; Path=/; Max-Age=${Math.min(shareLeft, PORTAL_MAX_AGE)}; HttpOnly; Secure; SameSite=Lax`

  const view = await customerView(client, params, `/${slug}`)
  if (view.type === 'redirect') return new Response(null, { status: 303, headers: { Location: view.to, ...NO_STORE } })
  // ?pdf=1: 이 페이지 그대로 PDF 파일로 내려받는다 (PDF 저장 버튼)
  if (view.type === 'page' && !shareToken && params.get('pdf') === '1') {
    after(() => logAccess(req.headers, client, 'pdf', { slug, details: view.details }))
    const pdf = await htmlToPdf(portalPageHtml(client, view.send), req)
    return pdfResponse(pdf, `${client.name} 제안서·견적서 ${view.send.number}.pdf`)
  }
  const kind = shareToken ? 'share_view' : view.kind
  return new Response(trackedHtml(view.html, req.headers, slug, { client, kind, details: view.details }), { headers })
}

type PortalClient = NonNullable<Awaited<ReturnType<typeof getClientBySlug>>>

/**
 * 고객이 보는 화면 하나를 만든다(업체 페이지와 관리자 미리보기가 같이 쓴다). 발송본만 읽는다.
 * base 는 화면 안 링크의 주소(/atotech 또는 미리보기 주소). ?s=N 지난 발송본.
 */
export async function customerView(
  client: PortalClient,
  params: URLSearchParams,
  base: string,
): Promise<
  | { type: 'redirect'; to: string }
  | { type: 'empty'; html: string; kind: 'view'; details: Record<string, unknown> }
  | { type: 'compare'; html: string; kind: 'compare'; details: Record<string, unknown> }
  | { type: 'page'; html: string; send: Send; kind: 'view' | 'send_view'; details: Record<string, unknown> }
> {
  // 고객에게 보이는 것은 발송본뿐(숨긴 발송본 제외, 업체 페이지 공개를 껐으면 없음)
  const sends = await customerSends(client.id)
  if (!sends.length) return { type: 'empty', html: notReadyHtml(client.name), kind: 'view', details: { send: null } }
  const latest = sends[0]
  const want = (k: string) => {
    const n = Number(params.get(k))
    return Number.isSafeInteger(n) && n > 0 ? sends.find((x) => x.no === n) ?? null : null
  }
  // 없는(또는 숨긴) 발송본 번호면 최신으로 보낸다
  const back = { type: 'redirect' as const, to: base }

  // 2026-10-30 kevin: 견적 변경 내용은 내부(어드민)에서만 본다. 예전 비교 주소(?cmp=)는 최신 견적으로 보낸다
  if (params.has('cmp')) return back

  const pick = params.has('s') ? want('s') : latest
  if (!pick) return back
  const send = await getSend(client.id, pick.no)
  if (!send) return back
  const old = send.no !== latest.no
  return {
    type: 'page',
    html: portalPageHtml(client, send, { base, sends }),
    send,
    kind: old ? 'send_view' : 'view',
    details: { send: send.number, latest: !old },
  }
}

/**
 * 업체 페이지 HTML: 발송본의 제안서 + 견적서(엔엠솔루션 양식) + 휴대폰 폭 맞춤 + PDF 저장 버튼.
 * history 를 주면 맨 위에 견적번호·견적 이력 띠를 붙인다(PDF 에는 안 붙임).
 */
export function portalPageHtml(
  client: PortalClient,
  send: Pick<Send, 'no' | 'proposalHtml' | 'quote'>,
  history?: { base: string; sends: Awaited<ReturnType<typeof listSends>> },
): string {
  const quote = send.quote
  const summary = quoteSummaryHtml(quote)
  const sheet = `<div class="quote-sheet">${renderQuote(quote, client)}</div>`
  const hasSummarySlot = send.proposalHtml.includes('<!--NM:QUOTE-SUMMARY-->')

  let html = withBrandLogo(send.proposalHtml)
    .split('{{QUOTE_NO}}')
    .join(esc(quote.number))
    .replace('<!--NM:QUOTE-SUMMARY-->', () => summary)
    .replace('<!--NM:QUOTE-->', () => (hasSummarySlot ? sheet : summary + sheet))
  const head = `<link rel="stylesheet" href="${PRETENDARD_CSS}"><style>${QUOTE_CSS}</style>`
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => `${head}</head>`) : head + html
  html = keepInside(html)
  const latest = history?.sends[0]
  const pdfButton = pdfButtonHtml(latest && send.no !== latest.no ? `?s=${send.no}&pdf=1` : '?pdf=1')
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${FIT_QUOTE}${pdfButton}</body>`) : html + FIT_QUOTE + pdfButton
  const current = history?.sends.find((x) => x.no === send.no)
  if (history && current) {
    const bar = historyBar(history.base, history.sends, current)
    html = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + bar) : bar + html
  }
  return html
}

/** 휴대폰처럼 좁은 화면에서는 견적서(A4 양식)를 옆으로 밀지 않아도 되게 화면 폭에 맞춰 줄인다. 두 손가락으로 확대해 볼 수 있다 */
const FIT_QUOTE = `<style>@media (max-width:720px){.quote-sheet{overflow:hidden!important;padding:12px 10px!important}.quote-sheet .nmq{min-width:640px}.quote-fit-hint{display:block!important}}</style>
<p class="quote-fit-hint" style="display:none;margin:8px 0 0;font-size:13px;color:#6b7280">화면 폭에 맞춰 줄인 견적서임. 두 손가락으로 벌리면 크게 볼 수 있음.</p>
<script>(function(){function fit(){document.querySelectorAll('.quote-sheet').forEach(function(w){var n=w.firstElementChild;if(!n)return;n.style.zoom='';var cs=getComputedStyle(w),avail=w.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),r=avail/n.scrollWidth;if(r<1)n.style.zoom=String(r);var h=document.querySelector('.quote-fit-hint');if(h&&h.parentNode!==w.parentNode)w.parentNode.insertBefore(h,w.nextSibling)})}
window.addEventListener('resize',fit);if(document.readyState!=='loading')fit();else document.addEventListener('DOMContentLoaded',fit)})()</script>`

/**
 * PDF 저장 버튼(오른쪽 아래 고정). 누르면 서버가 만든 PDF 파일(?pdf=1)을 바로 내려받는다. 인쇄물에는 버튼이 안 나온다.
 * 인쇄 CSS: 휴대폰 폭 맞춤 축소를 풀고, 제목이 쪽 끝에 홀로 남지 않게 한다.
 */
const pdfButtonHtml = (href: string) => `<style>.nm-pdf{position:fixed;right:16px;bottom:16px;z-index:50;display:inline-flex;align-items:center;gap:8px;font-family:Pretendard,'Noto Sans KR',sans-serif;font-size:14px;font-weight:700;padding:12px 18px;border-radius:999px;background:#0F2A44;color:#fff!important;text-decoration:none!important;box-shadow:0 6px 18px rgba(15,42,68,.28)}
.nm-pdf:hover{background:#163a5c}.nm-pdf svg{width:18px;height:18px}.nm-pdf[aria-busy=true]{opacity:.7;pointer-events:none}
@media print{h1,h2,h3,h4{break-after:avoid-page}figure,tr{break-inside:avoid}.nm-pdf,.quote-fit-hint{display:none!important}.quote-sheet .nmq{zoom:1!important;min-width:0!important}}</style>
<a class="nm-pdf" href="${href}" download><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span>PDF 다운로드</span></a>
<script>(function(){var a=document.querySelector('.nm-pdf');if(!a)return;a.addEventListener('click',function(){var t=a.querySelector('span');a.setAttribute('aria-busy','true');t.textContent='PDF 만드는 중…';setTimeout(function(){a.removeAttribute('aria-busy');t.textContent='PDF 다운로드'},15000)})})()</script>`

/** 페이지 밖으로 나가는 링크를 없앤다. 페이지 안 이동(#…)만 남기고 나머지 a 는 글자만 남긴다 */
function keepInside(html: string): string {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs: string, inner: string) => {
    const href = attrs.match(/\shref\s*=\s*["']([^"']*)["']/i)?.[1]
    if (href !== undefined && href.startsWith('#')) return m.replace(/\starget\s*=\s*["'][^"']*["']/i, '')
    const cls = attrs.match(/\sclass\s*=\s*["'][^"']*["']/i)?.[0] ?? ''
    return `<span${cls}>${inner}</span>`
  })
}

export async function portalPost(req: Request, slug: string): Promise<Response> {
  const client = await getClientBySlug(slug)
  if (!client) return notFound()
  const form = await req.formData().catch(() => null)
  const password = String(form?.get('password') ?? '').trim()
  const ok = !!password && (await verifyPortalPassword(password, client.portalPasswordHash))
  const token = ok ? await portalToken(slug) : null
  const viewId = token ? undefined : crypto.randomUUID()
  after(() => logAccess(req.headers, client, token ? 'login_ok' : 'login_fail', { slug, viewId }))
  if (!token) {
    // 비밀번호가 짧을 수 있어 연속 대입을 늦춘다
    await new Promise((r) => setTimeout(r, 1500))
    return loginPage(`${client.name} 공사 자료`, true, viewId)
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
