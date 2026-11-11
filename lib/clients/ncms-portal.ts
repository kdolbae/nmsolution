import { PORTAL_MAX_AGE, portalCookieName, portalToken } from './portal'

/**
 * 업체 페이지(nm-solution.co.kr/<주소>)를 N-CMS 에서 가져와 그대로 보여 준다(kevin 2026-11-11:
 * "N-CMS 에서 모든 자료 만들고 저장하되, 소비자 링크는 계속 nm 으로", 플랜트사업부 업체 페이지만).
 * - N-CMS 의 업체 페이지(/s/project/<주소>)는 한 장짜리 HTML 이라 요청·응답을 그대로 넘긴다(주소창은 nm 그대로).
 * - 비밀번호·임시 링크 확인과 열람 기록은 N-CMS 가 한다. 쿠키·이동 주소의 /s/project/<주소> 만 /<주소> 로 바꾼다.
 * - 제안서 안 사진(/client-assets/<주소>/)은 여기 proxy.ts 가 엔엠 쿠키를 보므로, N-CMS 가 들여보내면 엔엠 쿠키도 같이 준다.
 * - N-CMS 에 그 주소가 없거나(404) 연결이 안 되면 null → 예전처럼 엔엠 자료로 보여 준다.
 */
const NCMS = () => (process.env.NCMS_URL || 'https://sbworks.bond').replace(/\/$/, '')
const SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/

export async function ncmsPortal(req: Request, slug: string): Promise<Response | null> {
  if (!SLUG.test(slug) || process.env.NCMS_PORTAL === 'off') return null
  const url = new URL(req.url)
  const h = new Headers()
  for (const k of ['cookie', 'user-agent', 'accept', 'accept-language', 'referer', 'content-type']) {
    const v = req.headers.get(k)
    if (v) h.set(k, v)
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  if (ip) h.set('x-forwarded-for', ip)
  let res: Response
  try {
    res = await fetch(`${NCMS()}/s/project/${slug}${url.search}`, {
      method: req.method,
      headers: h,
      body: req.method === 'POST' ? await req.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000),
    })
  } catch (e) {
    console.error('[ncms-portal] 연결 실패', slug, e)
    return null
  }
  if (res.status === 404) return null

  const out = new Headers()
  for (const k of ['content-type', 'content-disposition', 'cache-control', 'x-robots-tag', 'referrer-policy']) {
    const v = res.headers.get(k)
    if (v) out.set(k, v)
  }
  const from = `/s/project/${slug}`
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
