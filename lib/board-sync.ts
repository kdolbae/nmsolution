import { createHash, createHmac, createPrivateKey, sign, type KeyObject } from 'node:crypto'
import { phoneDigits } from '@/lib/quote'

/**
 * 마케팅 상황판 연동 — 나노마스터 상황판(nanomaster.co.kr/admin/stats?brand=nmsolution)과 같은 화면으로 본다.
 *
 * 방문·문의를 우리 DB 에 적을 때마다 그 사본을 나노마스터로 보낸다. 나노마스터는 받은 줄을 따로 두고
 * (partner_events · partner_inquiries) 자기 상황판과 같은 계산으로 그린다. 그쪽 상황판을 고치면 여기도 같이 바뀐다.
 *
 * - 보낸 쪽 증명: Vercel 환경변수 NM_BOARD_KEY(ECDSA P-256 개인키, pkcs8 DER base64)로 본문에 서명한다.
 *   나노마스터에는 공개키만 있다. 값이 없으면 아무것도 보내지 않는다(사이트는 그대로 돈다).
 * - 문의는 건수·시각·종류·번호 해시만 보낸다. 이름·연락처 원문은 나가지 않는다.
 *   번호 해시는 개인키에서 만든 비밀로 HMAC 한다 — 010 번호는 경우의 수가 적어 그냥 해시하면 되돌릴 수 있다.
 * - 같은 줄(src_id)을 다시 보내도 나노마스터에는 한 번만 남는다. 그래서 지난 기록을 몰아 보내도 된다.
 */
const ENDPOINT = 'https://nanomaster.co.kr/api/partner-track'
const BRAND = 'nmsolution'

let cached: { raw: string; key: KeyObject; hmac: Buffer } | null = null
function keys() {
  const raw = (process.env.NM_BOARD_KEY || '').trim()
  if (!raw) return null
  if (cached?.raw === raw) return cached
  try {
    const key = createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' })
    const hmac = createHash('sha256').update('nm-board-phone:').update(raw).digest()
    cached = { raw, key, hmac }
    return cached
  } catch (e) {
    console.error('[board-sync] NM_BOARD_KEY 를 읽지 못했습니다', e)
    return null
  }
}

export const boardSyncEnabled = () => !!keys()

/** 네이버 광고 검색어·그룹 등 유입 판정은 나노마스터 원장과 같은 규칙으로 (그쪽 /api/track 의 classify). */
export function boardSource(r: { source: string | null; utm_source: string | null; utm_medium: string | null; ad_query: string | null; ad_group?: string | null }) {
  const us = (r.utm_source || '').toLowerCase()
  const um = (r.utm_medium || '').toLowerCase()
  if (r.ad_query || r.ad_group || r.source === 'naver_ad') return 'naver_ad'
  if (us.includes('naver')) return /cpc|ad|paid|sa|powerlink/.test(um) ? 'naver_ad' : 'naver'
  if (us) return us
  return r.source || 'direct'
}

export type BoardEvent = {
  id: number | string
  created_at: Date | string
  type: string
  label: string | null
  path: string | null
  referrer: string | null
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ad_query: string | null
  ad_rank: number | null
  ad_group?: string | null
  session_id: string | null
  visitor_id: string | null
  is_new?: boolean | null
  ua: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  seconds: number | null
  scroll: number | null
}
export type BoardInquiry = { id: number; created_at: Date | string; kind: string; phone: string; source_page?: string | null }

const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString()

/** 한 번에 보낸다(최대 1000줄). 실패해도 던지지 않고 false — 방문자 요청을 막지 않는다. */
export async function sendToBoard(events: BoardEvent[], inquiries: BoardInquiry[] = []): Promise<boolean> {
  const k = keys()
  if (!k || (!events.length && !inquiries.length)) return false
  const body = JSON.stringify({
    brand: BRAND,
    ts: Math.floor(Date.now() / 1000),
    events: events.map((e) => ({
      src_id: Number(e.id),
      created_at: iso(e.created_at),
      type: e.type,
      label: e.label,
      path: e.path,
      referrer: e.referrer,
      source: boardSource(e),
      utm_source: e.utm_source,
      utm_medium: e.utm_medium,
      utm_campaign: e.utm_campaign,
      utm_content: e.utm_content,
      utm_term: e.utm_term,
      ad_query: e.ad_query,
      ad_rank: e.ad_rank,
      ad_group: e.ad_group ?? null,
      session_id: e.session_id,
      visitor_id: e.visitor_id,
      is_new: e.is_new ?? null,
      ua: e.ua,
      country: e.country ?? null,
      region: e.region ?? null,
      city: e.city ?? null,
      seconds: e.seconds,
      scroll: e.scroll,
    })),
    inquiries: inquiries.map((q) => {
      const digits = phoneDigits(q.phone)
      return {
        src_id: q.id,
        created_at: iso(q.created_at),
        kind: q.kind,
        source_page: q.source_page ?? null,
        phone_hash: digits ? createHmac('sha256', k.hmac).update(digits).digest('hex').slice(0, 32) : null,
      }
    }),
  })
  const sig = sign('sha256', Buffer.from(body), { key: k.key, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Partner-Sig': sig },
      body,
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('[board-sync] 나노마스터 응답', r.status, await r.text().catch(() => ''))
    return r.ok
  } catch (e) {
    console.error('[board-sync] 보내기 실패', e)
    return false
  }
}

/** Vercel 이 준 접속 위치(IP 는 저장하지 않는다). 시/도는 한글로 — 나노마스터 상황판이 그대로 쓴다. */
const KR_REGION: Record<string, string> = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주', '30': '대전', '31': '울산', '50': '세종',
  '41': '경기', '42': '강원', '51': '강원', '43': '충북', '44': '충남', '45': '전북', '52': '전북', '46': '전남',
  '47': '경북', '48': '경남', '49': '제주',
}
export function geoOf(h: Headers) {
  const country = (h.get('x-vercel-ip-country') || '').slice(0, 2) || null
  const code = h.get('x-vercel-ip-country-region') || ''
  let city = h.get('x-vercel-ip-city') || ''
  try {
    city = decodeURIComponent(city)
  } catch {}
  return {
    country,
    region: (country === 'KR' ? KR_REGION[code] : null) || code || null,
    city: city.slice(0, 80) || null,
  }
}
