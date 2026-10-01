import { auth } from '@/lib/auth'

// sbworks.bond 관리 웹에서 넘어온 로그인 (서버 전용)
//
// 왜: 나노마스터·엔엠솔루션 관리 화면을 회사 관리 웹(sbworks.bond) 한 곳에서 열고, 누가 볼 수 있는지는
// 그쪽 권한으로 정하기로 했다(2026-10-01 사업주 요청). 관리 화면 기능은 하나도 옮기지 않는다.
//
// 흐름: 관리 웹이 60초짜리 ES256 토큰을 만들어 /api/admin/sso 로 넘긴다 → 여기서 공개키
// (환경 변수 SITE_SSO_PUBLIC_KEY, 비밀 아님)로 확인 → 이 사이트 서명 쿠키 nm_hub(12시간)를 준다.
// 관리 화면 문지기(getAdminSession)는 원래 관리자 로그인(better-auth)이 먼저, 없으면 이 쿠키를 본다.
// 쿠키 서명 키는 BETTER_AUTH_SECRET 에서 만든다(새 비밀값을 두지 않으려고). 둘 중 하나라도 없으면 이 길은 닫힌다.

export const HUB_COOKIE = 'nm_hub'
const HUB_HOURS = 12

export type AdminSession = { user: { id: string; name: string; email: string | null }; via: 'password' | 'sbworks' }

const enc = new TextEncoder()
const b64url = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  const out = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i)
  return out
}

let pubCache: { raw: string; key: CryptoKey } | null = null
async function publicKey(): Promise<CryptoKey | null> {
  const raw = process.env.SITE_SSO_PUBLIC_KEY?.trim() ?? ''
  if (!raw) return null
  if (pubCache?.raw === raw) return pubCache.key
  try {
    const jwk = JSON.parse(raw) as JsonWebKey
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    pubCache = { raw, key }
    return key
  } catch (e) {
    console.error('[sso] SITE_SSO_PUBLIC_KEY 를 읽지 못했습니다', e)
    return null
  }
}

let hmacCache: { raw: string; key: CryptoKey } | null = null
async function hmacKey(): Promise<CryptoKey | null> {
  const raw = process.env.BETTER_AUTH_SECRET?.trim() ?? ''
  if (raw.length < 16) return null
  if (hmacCache?.raw === raw) return hmacCache.key
  // better-auth 가 쓰는 값 그대로 쓰지 않고, 용도를 붙여 한 번 해시한 값을 쓴다.
  const material = await crypto.subtle.digest('SHA-256', enc.encode(`nm-hub-cookie:${raw}`))
  const key = await crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  hmacCache = { raw, key }
  return key
}

export const ssoReady = () => !!process.env.SITE_SSO_PUBLIC_KEY?.trim() && (process.env.BETTER_AUTH_SECRET?.trim().length ?? 0) >= 16

type Claims = { iss: string; aud: string; sub: string; name: string; email: string | null; role: string; exp: number }

/** 관리 웹 토큰 확인. 서명·발급처·대상·만료·역할이 모두 맞을 때만. */
export async function verifySsoToken(token: string): Promise<Claims | null> {
  const key = await publicKey()
  if (!key || typeof token !== 'string' || token.length > 4096) return null
  const p = token.split('.')
  if (p.length !== 3) return null
  try {
    const head = JSON.parse(new TextDecoder().decode(fromB64url(p[0])))
    if (head.alg !== 'ES256') return null
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromB64url(p[2]), enc.encode(`${p[0]}.${p[1]}`))
    if (!ok) return null
    const c = JSON.parse(new TextDecoder().decode(fromB64url(p[1]))) as Claims
    const now = Math.floor(Date.now() / 1000)
    if (c.iss !== 'sbworks.bond' || c.aud !== 'nmsolution' || c.role !== 'admin') return null
    if (typeof c.exp !== 'number' || c.exp < now || c.exp - now > 120) return null
    if (typeof c.sub !== 'string' || !/^[\w-]{1,64}$/.test(c.sub)) return null
    return c
  } catch {
    return null
  }
}

/** 확인된 토큰으로 이 사이트 쿠키 값을 만든다. */
export async function hubCookie(c: Claims): Promise<{ value: string; maxAge: number } | null> {
  const key = await hmacKey()
  if (!key) return null
  const maxAge = HUB_HOURS * 3600
  const body = b64url(enc.encode(JSON.stringify({ sub: c.sub, name: (c.name || '').slice(0, 60), email: c.email, exp: Math.floor(Date.now() / 1000) + maxAge })))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)))
  return { value: `${body}.${b64url(sig)}`, maxAge }
}

function readCookie(h: Headers, name: string) {
  const m = (h.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

async function fromHubCookie(h: Headers): Promise<AdminSession | null> {
  const v = readCookie(h, HUB_COOKIE)
  if (!v) return null
  const [body, sig] = v.split('.')
  const key = await hmacKey()
  if (!key || !body || !sig) return null
  try {
    if (!(await crypto.subtle.verify('HMAC', key, fromB64url(sig), enc.encode(body)))) return null
    const c = JSON.parse(new TextDecoder().decode(fromB64url(body))) as { sub: string; name: string; email: string | null; exp: number }
    if (typeof c.exp !== 'number' || c.exp < Math.floor(Date.now() / 1000)) return null
    return { user: { id: `sbworks:${c.sub}`, name: c.name || '관리 웹 사용자', email: c.email ?? null }, via: 'sbworks' }
  } catch {
    return null
  }
}

/** 관리 화면 문지기. 원래 관리자 로그인이 먼저, 없으면 관리 웹에서 넘어온 로그인. */
export async function getAdminSession(h: Headers): Promise<AdminSession | null> {
  const s = await auth.api.getSession({ headers: h })
  if (s?.user) return { user: { id: s.user.id, name: s.user.name, email: s.user.email }, via: 'password' }
  return fromHubCookie(h)
}
