import { beforeAll, describe, expect, it } from 'vitest'
import { b64url } from '../crypto'
import { verifySsoToken, type Jwk } from '../verify'
import { makeStateCookie, parseStateCookie, readSessionCookie, signSessionCookie } from '../state'
import { safeNext } from '../config'
import { estRoleFor } from '@/lib/est/perm'

const ISS = 'https://sbworks.bond'
const AUD = 'nmsolution'
const KID = '2026-10'
let priv: CryptoKey
let jwk: Jwk
let other: CryptoKey

beforeAll(async () => {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  priv = kp.privateKey
  const pub = (await crypto.subtle.exportKey('jwk', kp.publicKey)) as JsonWebKey
  jwk = { kty: 'EC', crv: 'P-256', kid: KID, x: pub.x, y: pub.y, use: 'sig', alg: 'ES256' }
  const kp2 = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  other = kp2.privateKey
})

const now = () => Math.floor(Date.now() / 1000)
function claims(over: Record<string, unknown> = {}) {
  const t = now()
  return {
    iss: ISS,
    aud: AUD,
    sub: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
    iat: t,
    exp: t + 120,
    jti: 'a'.repeat(32),
    nonce: 'n1',
    email: 'staff@nm-solution.co.kr',
    name: '직원',
    tenant: { id: '11111111-1111-4111-8111-111111111111', slug: 'nmsolution', name: '엔엠솔루션' },
    role: { code: 'staff', name: '사무' },
    scope: 'tenant',
    branch: null,
    perms: ['approval.decide'],
    memberships: [{ tenant_id: '11111111-1111-4111-8111-111111111111', slug: 'nmsolution', name: '엔엠솔루션', role_code: 'staff', app_url: 'https://nm-solution.co.kr/admin' }],
    hq: false,
    v: 1,
    ...over,
  }
}

async function sign(payload: unknown, key = priv, header: Record<string, unknown> = { alg: 'ES256', typ: 'JWT', kid: KID }) {
  const h = b64url(Buffer.from(JSON.stringify(header)))
  const p = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`
}

const opts = (nonce = 'n1') => ({ issuer: ISS, audience: AUD, nonce, getKey: async (kid: string) => (kid === KID ? jwk : null) })

describe('SSO 토큰 검증', () => {
  it('정상 토큰', async () => {
    const r = await verifySsoToken(await sign(claims()), opts())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.claims.tenant.slug).toBe('nmsolution')
  })
  it('만료 → expired', async () => {
    const t = now() - 600
    const r = await verifySsoToken(await sign(claims({ iat: t, exp: t + 60 })), opts())
    expect(r).toEqual({ ok: false, code: 'expired' })
  })
  it('120초 넘는 토큰 → bad_claims', async () => {
    const t = now()
    expect(await verifySsoToken(await sign(claims({ iat: t, exp: t + 600 })), opts())).toEqual({ ok: false, code: 'bad_claims' })
  })
  it('aud 불일치 → bad_claims', async () => {
    expect(await verifySsoToken(await sign(claims({ aud: 'nanomaster' })), opts())).toEqual({ ok: false, code: 'bad_claims' })
  })
  it('서명 변조 → bad_signature', async () => {
    const tok = await sign(claims())
    const [h, , s] = tok.split('.')
    const forged = `${h}.${b64url(Buffer.from(JSON.stringify(claims({ email: 'evil@x' }))))}.${s}`
    expect(await verifySsoToken(forged, opts())).toEqual({ ok: false, code: 'bad_signature' })
    expect(await verifySsoToken(await sign(claims(), other), opts())).toEqual({ ok: false, code: 'bad_signature' })
  })
  it('alg none·모르는 kid → bad_signature', async () => {
    expect(await verifySsoToken(await sign(claims(), priv, { alg: 'none', kid: KID }), opts())).toEqual({ ok: false, code: 'bad_signature' })
    expect(await verifySsoToken(await sign(claims(), priv, { alg: 'ES256', kid: 'old' }), opts())).toEqual({ ok: false, code: 'bad_signature' })
  })
  it('nonce 불일치 → nonce_mismatch', async () => {
    expect(await verifySsoToken(await sign(claims()), opts('other'))).toEqual({ ok: false, code: 'nonce_mismatch' })
  })
  it('JWKS 를 못 받으면 jwks_unavailable', async () => {
    const r = await verifySsoToken(await sign(claims()), { ...opts(), getKey: async () => { throw new Error('down') } })
    expect(r).toEqual({ ok: false, code: 'jwks_unavailable' })
  })
  it('kid 가 없으면 한 번 다시 받음', async () => {
    const calls: boolean[] = []
    const r = await verifySsoToken(await sign(claims()), { ...opts(), getKey: async (_k, refresh) => (calls.push(refresh), refresh ? jwk : null) })
    expect(r.ok).toBe(true)
    expect(calls).toEqual([false, true])
  })
})

describe('state·세션 쿠키', () => {
  const S = 'x'.repeat(40)
  it('state 왕복·변조·만료', () => {
    const t = now()
    const c = makeStateCookie('st', 'no', t + 600, S)
    expect(parseStateCookie(c, S, t)).toEqual({ state: 'st', nonce: 'no' })
    expect(parseStateCookie(c.replace('st.', 'xx.'), S, t)).toBeNull()
    expect(parseStateCookie(c, S, t + 601)).toBeNull()
    expect(parseStateCookie(c, 'y'.repeat(40), t)).toBeNull()
  })
  it('세션 쿠키', () => {
    const id = 'f'.repeat(32)
    expect(readSessionCookie(signSessionCookie(id, S), S)).toBe(id)
    expect(readSessionCookie(`${id}.bad`, S)).toBeNull()
  })
  it('next 는 /admin 하위만', () => {
    expect(safeNext('/admin/est')).toBe('/admin/est')
    expect(safeNext('https://evil.com')).toBe('/admin')
    expect(safeNext('//evil.com')).toBe('/admin')
    expect(safeNext('/adminx')).toBe('/admin')
  })
})

describe('역할 매핑', () => {
  const map = { owner: 'ceo', branch_manager: 'reviewer', staff: 'writer', sales: 'writer', technician: null }
  it('표대로, tenant.manage 는 ceo, null 은 거절, 없으면 writer', () => {
    expect(estRoleFor('branch_manager', [], map)).toBe('reviewer')
    expect(estRoleFor('staff', ['tenant.manage'], map)).toBe('ceo')
    expect(estRoleFor('technician', [], map)).toBeNull()
    expect(estRoleFor('newrole', [], map)).toBe('writer')
  })
})
