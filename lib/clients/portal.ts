/**
 * 업체용 링크(예: nm-solution.co.kr/sinil) 접근 쿠키.
 *
 * 업체 아이디·비밀번호는 clients 표(portal_*)에 두고, 맞으면 업체 주소별 쿠키를 준다.
 * 쿠키 값은 주소와 BETTER_AUTH_SECRET 로 만든 해시라 서버 밖에서는 만들 수 없다. 비밀값이 없으면 아무도 못 들어간다.
 * 페이지(lib/clients/portal-route.ts)와 사진(proxy.ts, /client-assets/<주소>/) 모두 이 쿠키를 확인한다.
 * proxy 에서도 쓰므로 Node 전용 API 없이 Web Crypto 만 쓴다.
 */

export const PORTAL_MAX_AGE = 60 * 60 * 24 * 7

export function portalCookieName(slug: string) {
  return `nm_portal_${slug}`
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function portalToken(slug: string): Promise<string | null> {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) return null
  return sha256Hex(`nm-portal:v1:${slug}:${secret}`)
}

/**
 * 임시 링크(?k=…): 로그인 없이 기한까지 열린다. DB 에는 해시(portal_share_hash)와 기한(portal_share_expires)만 둔다.
 * 맞으면 남은 기간만큼 업체 쿠키를 준다.
 */
export async function shareHash(slug: string, key: string): Promise<string> {
  return sha256Hex(`nm-share:v1:${slug}:${key}`)
}

export async function validShareKey(slug: string, key: string | null, hash: string, expires: Date | null): Promise<number> {
  if (!key || !hash || !expires) return 0
  const left = Math.floor((expires.getTime() - Date.now()) / 1000)
  if (left <= 0) return 0
  return (await shareHash(slug, key)) === hash ? left : 0
}

export async function hasPortalAccess(slug: string, cookieValue: string | undefined): Promise<boolean> {
  const token = await portalToken(slug)
  return Boolean(token && cookieValue && cookieValue === token)
}

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return undefined
}
