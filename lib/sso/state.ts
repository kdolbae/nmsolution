/**
 * state 쿠키(nm_sso_state = state.nonce.exp.sig)와 세션 쿠키(nm_sso = id.sig). HMAC-SHA256(SSO_STATE_SECRET).
 */
import { hmac, safeEqual } from './crypto'

export const STATE_TTL_SEC = 600

export function makeStateCookie(state: string, nonce: string, exp: number, secret: string): string {
  const body = `${state}.${nonce}.${exp}`
  return `${body}.${hmac(secret, `state:${body}`)}`
}

export function parseStateCookie(value: string | undefined | null, secret: string, nowSec: number): { state: string; nonce: string } | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const [state, nonce, expS, sig] = parts
  if (!safeEqual(sig, hmac(secret, `state:${state}.${nonce}.${expS}`))) return null
  const exp = Number(expS)
  if (!Number.isFinite(exp) || exp < nowSec) return null
  return { state, nonce }
}

export function signSessionCookie(id: string, secret: string): string {
  return `${id}.${hmac(secret, `session:${id}`)}`
}

export function readSessionCookie(value: string | undefined | null, secret: string): string | null {
  if (!value) return null
  const i = value.lastIndexOf('.')
  if (i <= 0) return null
  const id = value.slice(0, i)
  if (!/^[0-9a-f]{32}$/.test(id)) return null
  return safeEqual(value.slice(i + 1), hmac(secret, `session:${id}`)) ? id : null
}
