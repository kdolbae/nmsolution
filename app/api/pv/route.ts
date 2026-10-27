import { updateView } from '@/lib/clients/access-log'

export const dynamic = 'force-dynamic'

/** 업체 페이지 안 스크립트(public/js/pv.js)가 보내는 열람 행동 기록. 무엇을 받든 204 로만 답한다 */
const n = (v: unknown, max: number) => {
  const x = Math.round(Number(v))
  return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0
}

export async function POST(req: Request) {
  const raw = await req.text().catch(() => '')
  if (raw.length > 100_000) return new Response(null, { status: 204 })
  let b: Record<string, unknown> | null = null
  try {
    b = JSON.parse(raw)
  } catch {}
  const v = typeof b?.v === 'string' ? b.v : ''
  if (!b || !/^[0-9a-f-]{36}$/.test(v)) return new Response(null, { status: 204 })
  const sections: Record<string, number> = {}
  if (b.sections && typeof b.sections === 'object')
    for (const [k, s] of Object.entries(b.sections as Record<string, unknown>).slice(0, 80)) sections[k.slice(0, 80)] = n(s, 86400)
  const list = (x: unknown) =>
    (Array.isArray(x) ? x : []).slice(0, 300).map((e) => ({
      t: n(e?.t, 86400),
      label: String(e?.label ?? '').slice(0, 120),
    }))
  try {
    await updateView(v, n(b.seconds, 86400), n(b.scroll, 100), {
      total: n(b.total, 86400),
      sections,
      clicks: list(b.clicks),
      events: list(b.events),
      screen: String(b.screen ?? '').slice(0, 20),
      lang: String(b.lang ?? '').slice(0, 20),
      tz: String(b.tz ?? '').slice(0, 40),
    })
  } catch (e) {
    console.error('pv', e)
  }
  return new Response(null, { status: 204 })
}
