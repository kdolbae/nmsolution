import { NextResponse } from 'next/server'
import { HQ_SIG_HEADER, HQ_TS_HEADER, parsePeriod, verifyHq } from '@/lib/hq/signature'
import { hqKpis } from '@/lib/hq/summary'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

/** 본사 요약(SBworks /hq 가 HMAC 서명으로 부름). 단가·원가·이익 금액은 절대 넣지 않음 (§10.1) */
export async function GET(req: Request) {
  const secret = process.env.HQ_SUMMARY_SECRET || ''
  if (secret.length < 16) return json({ error: 'not_configured' }, 503)
  const url = new URL(req.url)
  const ok = verifyHq(secret, {
    ts: req.headers.get(HQ_TS_HEADER),
    sig: req.headers.get(HQ_SIG_HEADER),
    method: 'GET',
    path: url.pathname,
    tail: url.search.replace(/^\?/, ''),
  })
  if (!ok) return json({ error: 'bad_signature' }, 401)
  const period = parsePeriod(url.searchParams.get('from'), url.searchParams.get('to'))
  if (!period) return json({ error: 'bad_period' }, 400)
  try {
    const kpis = await hqKpis(period.from, period.to)
    const k = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19)
    return json({
      division: process.env.SSO_APP_ID || 'nmsolution',
      name: '엔엠솔루션',
      period,
      generated_at: `${k}+09:00`,
      kpis,
      links: { app: `${url.origin}/admin/est`, ledger: `${url.origin}/admin/est/ledger` },
    })
  } catch (e) {
    console.error('[hq] summary', e)
    return json({ error: 'server_error' }, 500)
  }
}
