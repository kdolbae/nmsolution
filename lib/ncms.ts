import { unstable_cache } from 'next/cache'

/**
 * N-CMS(sbworks.bond) 연동 — 엔엠 어드민을 지운 뒤 홈페이지 내용과 견적 문의는 N-CMS 에서 관리한다(kevin 2026-11-10).
 * N-CMS 설계 문서: kdolbae/sb_app01 manage/uffice/31_홈페이지_내용_N-CMS.md
 *  - 내용 읽기: GET {NCMS_URL}/api/public/homepage/nm-solution (로그인 없음). 5분 캐시 + N-CMS 저장 때 /api/revalidate 로 바로 새로.
 *  - 견적 문의: POST {NCMS_URL}/api/public/homepage/nm-solution/inquiry (Bearer SBWORKS_API_KEY — N-CMS 쪽 NM_SOLUTION_API_KEY 와 같은 값)
 * NCMS_URL 이 없으면 https://sbworks.bond. 서버 전용.
 */
export const NCMS_SLUG = 'nm-solution'
export const NCMS_TAG = 'ncms-homepage'
const base = () => (process.env.NCMS_URL || 'https://sbworks.bond').replace(/\/$/, '')

export type NcmsCase = {
  id: string
  title: string
  category: string
  location: string
  year: string
  duration: string
  description: string
  imageUrl: string
  sortOrder: number
  createdAt: string
}
export type NcmsHomepage = {
  slug: string
  name: string
  updatedAt: string | null
  /** N-CMS 에서 실제로 저장한 페이지 키. 없는 키는 N-CMS 기본값이라 엔엠 쪽 마지막 내용을 쓴다 */
  savedKeys?: string[]
  pages: Record<string, unknown>
  cases: NcmsCase[]
}

/**
 * 홈페이지 내용 전체(페이지 4개 + 공개 시공사례). 실패하면 던진다 — 캐시에 실패가 남지 않고, 부르는 쪽이 예전 내용(엔엠 DB·기본값)으로 그린다.
 * 페이지들이 force-dynamic 이라 fetch 캐시 대신 unstable_cache 로 둔다(방문마다 N-CMS 를 부르지 않게).
 */
export const ncmsHomepage = unstable_cache(
  async (): Promise<NcmsHomepage> => {
    const res = await fetch(`${base()}/api/public/homepage/${NCMS_SLUG}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(`N-CMS 홈페이지 내용 응답 ${res.status}`)
    const body = (await res.json()) as NcmsHomepage
    if (!body || typeof body.pages !== 'object' || !Array.isArray(body.cases)) throw new Error('N-CMS 홈페이지 내용 모양이 다름')
    return body
  },
  ['ncms-homepage', NCMS_SLUG],
  { revalidate: 300, tags: [NCMS_TAG] },
)

/** N-CMS 를 못 읽으면 null (로그만). 홈페이지는 그대로 열린다 */
export async function ncmsHomepageOrNull(): Promise<NcmsHomepage | null> {
  try {
    return await ncmsHomepage()
  } catch (e) {
    console.error('[ncms] 홈페이지 내용을 읽지 못함', e)
    return null
  }
}

export type NcmsInquiry = {
  /** 엔엠 quote_requests.id — N-CMS 에 nm-quote-<id> 로 남아 「엔엠 자료 가져오기」와 겹치지 않는다 */
  quoteId: number
  name: string
  phone: string
  company?: string
  location?: string
  categories?: string
  message?: string
  sourcePage?: string | null
  utm?: Record<string, string>
  photos?: { mime: string; data: Buffer }[]
}

/**
 * 견적 문의를 N-CMS 문의·상담으로 보낸다. 실패해도 던지지 않고 false — 문의는 엔엠 DB 에 이미 있어
 * N-CMS 「엔엠 자료 가져오기」를 다시 누르면 같은 번호로 들어간다(두 번 들어가지 않음).
 */
export async function sendInquiryToNcms(q: NcmsInquiry): Promise<boolean> {
  const key = process.env.SBWORKS_API_KEY
  if (!key) return false
  const fd = new FormData()
  const put = (k: string, v: string | null | undefined) => {
    if (v && v.trim()) fd.set(k, v.trim())
  }
  put('external_id', `nm-quote-${q.quoteId}`)
  put('name', q.name)
  put('phone', q.phone)
  put('company', q.company)
  put('location', q.location)
  put('categories', q.categories)
  put('message', q.message)
  put('source_page', q.sourcePage ? `https://nm-solution.co.kr${q.sourcePage.startsWith('/') ? q.sourcePage : `/${q.sourcePage}`}` : null)
  if (q.utm && Object.keys(q.utm).length) fd.set('utm', JSON.stringify(q.utm))
  for (const [i, p] of (q.photos ?? []).entries()) {
    fd.append('photos', new Blob([new Uint8Array(p.data)], { type: p.mime }), `photo-${i + 1}.${p.mime === 'image/png' ? 'png' : 'jpg'}`)
  }
  try {
    const res = await fetch(`${base()}/api/public/homepage/${NCMS_SLUG}/inquiry`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}` },
      body: fd,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) console.error('[ncms] 문의 보내기 실패', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('[ncms] 문의 보내기 실패', e)
    return false
  }
}

/** 엔엠 유입 칸(lib/attribution.ts attributionValues) → N-CMS 문의 utm 칸 이름 */
export function ncmsUtm(a: { utmSource: string; utmMedium: string; utmCampaign: string; utmTerm: string; utmContent: string; clickId: string; landingPath: string; referrer: string }) {
  const out: Record<string, string> = {}
  const pairs: [string, string][] = [
    ['utm_source', a.utmSource], ['utm_medium', a.utmMedium], ['utm_campaign', a.utmCampaign], ['utm_term', a.utmTerm], ['utm_content', a.utmContent],
    ['click_id', a.clickId], ['landing_path', a.landingPath], ['referrer', a.referrer],
  ]
  for (const [k, v] of pairs) if (v) out[k] = v
  return out
}
