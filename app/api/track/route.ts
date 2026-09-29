import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * 방문·유입·문의 기록 받기 (lib/site-events.ts 가 보낸다). 화면은 /admin/stats.
 * 개인정보는 받지 않는다. 봇·관리자 화면은 거른다. 실패해도 방문자에게는 204 를 돌려준다.
 */
const TYPES = new Set(['pageview', 'leave', 'call', 'kakao', 'form'])
const BOT = /bot|crawl|spider|slurp|yeti|daum|bingpreview|headless|lighthouse|facebookexternalhit|kakaotalk-scrap/i

const s = (v: unknown, n = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)
const i = (v: unknown, max: number) => {
  const x = Math.round(Number(v))
  return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : null
}

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') || ''
  if (BOT.test(ua)) return new Response(null, { status: 204 })
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b || !TYPES.has(String(b.type)) || String(b.path || '').startsWith('/admin')) return new Response(null, { status: 204 })
  try {
    await pool.query(
      `INSERT INTO site_events (type,label,path,referrer,source,utm_source,utm_medium,utm_campaign,utm_content,utm_term,
         ad_query,ad_rank,session_id,visitor_id,seconds,scroll,ua)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        b.type, s(b.label, 120), s(b.path, 300), s(b.referrer, 500), s(b.source, 80),
        s(b.utm_source, 80), s(b.utm_medium, 80), s(b.utm_campaign, 120), s(b.utm_content, 120), s(b.utm_term, 200),
        s(b.ad_query, 200), i(b.ad_rank, 100), s(b.session_id, 64), s(b.visitor_id, 64),
        i(b.seconds, 1800), i(b.scroll, 100), ua.slice(0, 300),
      ],
    )
  } catch (e) {
    console.error('[track] 기록 실패', e)
  }
  return new Response(null, { status: 204 })
}
