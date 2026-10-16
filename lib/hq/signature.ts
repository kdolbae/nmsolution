/**
 * 본사 요약·브리지 HMAC 서명(기획서 §10.1).
 * X-SBworks-Sig = base64url(HMAC-SHA256(secret, "${ts}\n${METHOD}\n${path}\n${rawQuery 또는 sha256(body)}")), ts 오차 ±300초.
 */
import { createHash } from 'node:crypto'
import { hmac, safeEqual } from '@/lib/sso/crypto'

export const HQ_TS_HEADER = 'X-SBworks-Ts'
export const HQ_SIG_HEADER = 'X-SBworks-Sig'
export const HQ_MAX_SKEW = 300

export function hqSign(secret: string, ts: number | string, method: string, path: string, tail: string): string {
  return hmac(secret, `${ts}\n${method.toUpperCase()}\n${path}\n${tail}`)
}

export function sha256Hex(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}

export function verifyHq(
  secret: string,
  input: { ts: string | null; sig: string | null; method: string; path: string; tail: string },
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!input.ts || !input.sig || !/^\d{1,12}$/.test(input.ts)) return false
  if (Math.abs(nowSec - Number(input.ts)) > HQ_MAX_SKEW) return false
  return safeEqual(input.sig, hqSign(secret, input.ts, input.method, input.path, input.tail))
}

/** 기간 YYYY-MM-DD. 없으면 이달(KST) */
export function parsePeriod(from: string | null, to: string | null, now = new Date()): { from: string; to: string } | null {
  const ok = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s
  if (!from && !to) {
    const k = new Date(now.getTime() + 9 * 3600 * 1000)
    const y = k.getUTCFullYear()
    const m = k.getUTCMonth()
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    const mm = String(m + 1).padStart(2, '0')
    return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` }
  }
  if (!from || !to || !ok(from) || !ok(to) || from > to) return null
  return { from, to }
}
