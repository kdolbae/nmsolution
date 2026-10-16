/**
 * SBworks SSO 토큰(ES256 JWT) 검증. 기획서 §3.4·§3.6. WebCrypto(crypto.subtle) 만 씀(라이브러리 없음).
 * 순서: 서명(kid → JWKS 키) → iss·aud·exp·iat → nonce. jti 1회용 저장은 DB 쪽(lib/sso/session.ts).
 */
import { b64urlDecode } from './crypto'

export type SsoMembership = { tenant_id: string; slug: string; name: string; role_code: string; app_url: string | null }

export type SsoClaims = {
  iss: string
  aud: string
  sub: string
  iat: number
  exp: number
  jti: string
  nonce: string
  email: string
  name: string
  tenant: { id: string; slug: string; name: string }
  role: { code: string; name: string }
  scope: string
  branch: { id: string; name: string } | null
  perms: string[]
  memberships: SsoMembership[]
  hq: boolean
  v: number
}

export type VerifyCode = 'bad_signature' | 'expired' | 'bad_claims' | 'nonce_mismatch' | 'jwks_unavailable'
export type VerifyResult = { ok: true; claims: SsoClaims } | { ok: false; code: VerifyCode }

export type Jwk = { kty: string; crv?: string; kid?: string; x?: string; y?: string; use?: string; alg?: string }

/** kid 로 공개키 찾기. refresh=true 면 캐시를 버리고 다시 받음. 받지 못하면 throw */
export type KeyLookup = (kid: string, refresh: boolean) => Promise<Jwk | null>

export const MAX_TOKEN_AGE = 120
export const CLOCK_SKEW = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function decodeJson(part: string): unknown {
  try {
    return JSON.parse(b64urlDecode(part).toString('utf8'))
  } catch {
    return null
  }
}

async function importJwk(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
}

function claimsShapeOk(c: Record<string, unknown>): boolean {
  const t = c.tenant
  const r = c.role
  const b = c.branch
  return (
    isStr(c.iss) &&
    isStr(c.aud) &&
    isStr(c.sub) &&
    UUID.test(c.sub as string) &&
    typeof c.iat === 'number' &&
    typeof c.exp === 'number' &&
    isStr(c.jti) &&
    /^[0-9a-f]{32}$/i.test(c.jti as string) &&
    isStr(c.nonce) &&
    isStr(c.email) &&
    typeof c.name === 'string' &&
    isObj(t) &&
    isStr(t.id) &&
    isStr(t.slug) &&
    typeof t.name === 'string' &&
    isObj(r) &&
    isStr(r.code) &&
    typeof c.scope === 'string' &&
    (b === null || b === undefined || (isObj(b) && isStr(b.id))) &&
    Array.isArray(c.perms) &&
    (c.memberships === undefined || Array.isArray(c.memberships)) &&
    c.v === 1
  )
}

export async function verifySsoToken(
  token: string,
  opts: { issuer: string; audience: string; nonce: string; getKey: KeyLookup; nowSec?: number },
): Promise<VerifyResult> {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return { ok: false, code: 'bad_signature' }
  const header = decodeJson(parts[0])
  if (!isObj(header) || header.alg !== 'ES256' || !isStr(header.kid)) return { ok: false, code: 'bad_signature' }

  // 1) 서명. kid 가 없으면 JWKS 를 즉시 한 번 다시 받음
  let jwk: Jwk | null
  try {
    jwk = await opts.getKey(header.kid as string, false)
    if (!jwk) jwk = await opts.getKey(header.kid as string, true)
  } catch {
    return { ok: false, code: 'jwks_unavailable' }
  }
  if (!jwk || jwk.kty !== 'EC' || (jwk.crv && jwk.crv !== 'P-256')) return { ok: false, code: 'bad_signature' }
  let valid = false
  try {
    const key = await importJwk(jwk)
    const sig = b64urlDecode(parts[2])
    if (sig.length !== 64) return { ok: false, code: 'bad_signature' }
    valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  } catch {
    valid = false
  }
  if (!valid) return { ok: false, code: 'bad_signature' }

  // 2) 클레임
  const c = decodeJson(parts[1])
  if (!isObj(c) || !claimsShapeOk(c)) return { ok: false, code: 'bad_claims' }
  if (c.iss !== opts.issuer || c.aud !== opts.audience) return { ok: false, code: 'bad_claims' }
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000)
  const iat = c.iat as number
  const exp = c.exp as number
  if (exp <= now - CLOCK_SKEW) return { ok: false, code: 'expired' }
  if (exp - iat > MAX_TOKEN_AGE || exp <= iat || iat > now + CLOCK_SKEW) return { ok: false, code: 'bad_claims' }

  // 3) nonce
  if (c.nonce !== opts.nonce) return { ok: false, code: 'nonce_mismatch' }

  const claims = c as unknown as SsoClaims
  return {
    ok: true,
    claims: {
      ...claims,
      branch: claims.branch ?? null,
      perms: claims.perms.map(String),
      memberships: Array.isArray(claims.memberships) ? claims.memberships : [],
      hq: claims.hq === true,
    },
  }
}
