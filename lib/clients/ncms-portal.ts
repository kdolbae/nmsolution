import { after } from 'next/server'
import { PORTAL_MAX_AGE, portalCookieName, portalToken } from './portal'
import { deviceOf } from './access-log'
import { geoOf } from '@/lib/board-sync'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { notifyAdmin } from '@/lib/notify/telegram'

/**
 * 업체 페이지(nm-solution.co.kr/<주소>)를 N-CMS 에서 가져와 그대로 보여 준다(kevin 2026-11-11:
 * "N-CMS 에서 모든 자료 만들고 저장하되, 소비자 링크는 계속 nm 으로", 플랜트사업부 업체 페이지만).
 * - N-CMS 의 업체 페이지(/s/project/<주소>)는 한 장짜리 HTML 이라 요청·응답을 그대로 넘긴다(주소창은 nm 그대로).
 * - 비밀번호·임시 링크 확인과 열람 기록은 N-CMS 가 한다. 쿠키·이동 주소의 /s/project/<주소> 만 /<주소> 로 바꾼다.
 * - 제안서 안 사진(/client-assets/<주소>/)은 여기 proxy.ts 가 엔엠 쿠키를 보므로, N-CMS 가 들여보내면 엔엠 쿠키도 같이 준다.
 * - N-CMS 에 그 주소가 없거나(404) 연결이 안 되면 null → 예전처럼 엔엠 자료로 보여 준다.
 * - 고객 위치(x-vercel-ip-*)를 x-client-* 로 실어 보낸다(N-CMS 가 보는 cf-* 는 이 서버 위치라서).
 * - N-CMS 가 열람·PDF 응답에 x-ncms-view 머리를 붙이면 관리자 텔레그램으로 알린다(예전 access-log.ts 와 같은 알림).
 */
const NOTIFY: Record<string, string> = {
  view: '견적 열람',
  share_view: '임시 링크로 열람',
  pdf: 'PDF 다운로드',
  login_fail: '비밀번호 틀림',
  work_order_view: '업무 지시서 열람(현장 팀)',
  work_order_pdf: '업무 지시서 PDF(현장 팀)',
}
const BOT = /bot|crawl|spider|slurp|yeti|daumoa|bingpreview|headless|lighthouse|facebookexternalhit|kakaotalk-scrap|slack-imgproxy|whatsapp|telegram|discord/i

const NCMS = () => (process.env.NCMS_URL || 'https://sbworks.bond').replace(/\/$/, '')
const SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/

const WORK_KEY = /^[a-z0-9]{20,64}$/

/**
 * 현장 팀 링크 nm-solution.co.kr/work/<키> 를 N-CMS(/s/work/<키>)에서 가져온다(kevin 2026-11-12).
 * N-CMS 에 그 키가 없으면 null → 예전 엔엠 업무 지시서로.
 */
export async function ncmsWork(req: Request, key: string): Promise<Response | null> {
  if (!WORK_KEY.test(key) || process.env.NCMS_PORTAL === 'off') return null
  return forward(req, `/s/work/${key}`, key, null)
}

export async function ncmsPortal(req: Request, slug: string): Promise<Response | null> {
  if (!SLUG.test(slug) || process.env.NCMS_PORTAL === 'off') return null
  return forward(req, `/s/project/${slug}`, slug, slug)
}

/** N-CMS 로 요청을 넘기고 응답을 돌려준다. slug 가 있으면 쿠키·이동 주소를 /<주소> 로 바꾼다 */
async function forward(req: Request, from: string, label: string, slug: string | null): Promise<Response | null> {
  const url = new URL(req.url)
  const h = new Headers()
  for (const k of ['cookie', 'user-agent', 'accept', 'accept-language', 'referer', 'content-type']) {
    const v = req.headers.get(k)
    if (v) h.set(k, v)
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  if (ip) h.set('x-forwarded-for', ip)
  const g = geoOf(req.headers)
  if (g.country) h.set('x-client-country', encodeURIComponent(g.country))
  if (g.region) h.set('x-client-region', encodeURIComponent(g.region))
  if (g.city) h.set('x-client-city', encodeURIComponent(g.city))
  let res: Response
  try {
    res = await fetch(`${NCMS()}${from}${url.search}`, {
      method: req.method,
      headers: h,
      body: req.method === 'POST' ? await req.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000),
    })
  } catch (e) {
    console.error('[ncms-portal] 연결 실패', label, e)
    return null
  }
  // 없는 주소(404)·N-CMS 오류(5xx)·방화벽 차단(403)이면 예전 엔엠 자료로
  if (res.status === 404 || res.status === 403 || res.status >= 500) return null

  const kind = res.headers.get('x-ncms-view')
  if (kind && NOTIFY[kind]) {
    const reqHeaders = req.headers
    const project = res.headers.get('x-ncms-project') || ''
    let name = slug ?? '업체'
    try {
      name = decodeURIComponent(res.headers.get('x-ncms-name') || '') || name
    } catch {}
    after(() => notifyView(reqHeaders, { kind, name, project, ip, geo: g }))
  }

  const out = new Headers()
  for (const k of ['content-type', 'content-disposition', 'cache-control', 'x-robots-tag', 'referrer-policy']) {
    const v = res.headers.get(k)
    if (v) out.set(k, v)
  }
  if (!slug) return new Response(res.body, { status: res.status, headers: out })
  const loc = res.headers.get('location')
  if (loc) out.set('location', loc.startsWith(from) ? `/${slug}${loc.slice(from.length)}` : loc)
  let entered = false
  for (const c of res.headers.getSetCookie()) {
    out.append('set-cookie', c.replace(new RegExp(`;\\s*Path=${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), `; Path=/${slug}`))
    entered = true
  }
  // 사진(/client-assets/<주소>/)용 엔엠 쿠키
  if (entered) {
    const token = await portalToken(slug)
    if (token) out.append('set-cookie', `${portalCookieName(slug)}=${token}; Path=/; Max-Age=${PORTAL_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`)
  }
  return new Response(res.body, { status: res.status, headers: out })
}

/** 업체가 견적을 열거나 PDF 를 받으면 관리자 휴대폰(텔레그램)으로. 관리자 본인·로봇은 뺀다 */
async function notifyView(h: Headers, v: { kind: string; name: string; project: string; ip: string; geo: { region: string | null; city: string | null } }) {
  const ua = h.get('user-agent') || ''
  if (BOT.test(ua)) return
  const session = await getSessionFrom(h).catch(() => null)
  if (session?.user && isAdmin(session.user)) return
  const when = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  await notifyAdmin(
    [
      `${v.name} · ${NOTIFY[v.kind]}`,
      when,
      [deviceOf(ua), [v.geo.region, v.geo.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
      v.ip ? `IP ${v.ip}` : '',
      v.project ? `${NCMS()}/projects/${v.project}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  ).catch(() => undefined)
}
