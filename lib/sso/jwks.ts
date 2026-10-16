/**
 * SBworks JWKS(공개키) 받기. 1시간 캐시, kid 가 없으면 즉시 한 번 다시 받음(verify.ts KeyLookup).
 */
import type { Jwk, KeyLookup } from './verify'
import { ssoJwksUrl } from './config'

let cache: { at: number; keys: Jwk[] } | null = null
const TTL = 60 * 60 * 1000

async function fetchKeys(): Promise<Jwk[]> {
  const res = await fetch(ssoJwksUrl(), { headers: { accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`JWKS ${res.status}`)
  const body = (await res.json()) as { keys?: Jwk[] }
  if (!Array.isArray(body.keys)) throw new Error('JWKS 모양이 다름')
  cache = { at: Date.now(), keys: body.keys }
  return body.keys
}

export const jwksLookup: KeyLookup = async (kid, refresh) => {
  const keys = !refresh && cache && Date.now() - cache.at < TTL ? cache.keys : await fetchKeys()
  return keys.find((k) => k.kid === kid) ?? null
}
