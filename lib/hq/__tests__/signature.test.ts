import { describe, expect, it } from 'vitest'
import { hqSign, parsePeriod, verifyHq } from '../signature'
import { HQ_KPI_KEYS } from '../kpi-keys'

const S = 's'.repeat(40)
describe('본사 요약 서명', () => {
  it('맞는 서명·틀린 서명·시간 초과', () => {
    const ts = 1_800_000_000
    const q = 'from=2026-10-01&to=2026-10-31'
    const sig = hqSign(S, ts, 'GET', '/api/hq/summary', q)
    expect(verifyHq(S, { ts: String(ts), sig, method: 'GET', path: '/api/hq/summary', tail: q }, ts + 10)).toBe(true)
    expect(verifyHq(S, { ts: String(ts), sig, method: 'GET', path: '/api/hq/summary', tail: 'from=2026-10-01' }, ts)).toBe(false)
    expect(verifyHq(S, { ts: String(ts), sig, method: 'GET', path: '/api/hq/summary', tail: q }, ts + 301)).toBe(false)
    expect(verifyHq(S, { ts: null, sig, method: 'GET', path: '/api/hq/summary', tail: q }, ts)).toBe(false)
  })
  it('기간', () => {
    expect(parsePeriod('2026-10-01', '2026-10-31')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(parsePeriod('2026-10-31', '2026-10-01')).toBeNull()
    expect(parsePeriod('2026-13-01', '2026-13-02')).toBeNull()
    expect(parsePeriod(null, null, new Date('2026-10-16T00:00:00Z'))).toEqual({ from: '2026-10-01', to: '2026-10-31' })
  })
  it('응답 키에 단가·원가·이익 금액이 없음', () => {
    const banned = /cost|price|profit|margin_amount|incentive|unit/i
    expect(HQ_KPI_KEYS.filter((k) => banned.test(k))).toEqual([])
  })
})
