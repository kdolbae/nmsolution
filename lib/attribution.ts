/**
 * 광고 유입 출처(어디서 온 방문인가)를 기억해 두었다가 견적 접수 때 함께 저장한다.
 *
 * 이게 없으면 광고를 켜도 "어느 키워드가 전화로 이어졌는지"를 알 수 없고,
 * 나중에 소급해서 알아낼 방법도 없다. 광고 집행보다 먼저 깔려 있어야 한다.
 *
 * 판정 규칙은 나노마스터 쪽(`site_events`)과 같다.
 *   1. 주소에 `utm_source` 가 있으면 그것을 쓴다
 *   2. 없으면 리퍼러(어느 사이트에서 넘어왔는지)를 본다
 *   3. 둘 다 없으면 `direct`
 */

export type Attribution = {
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  /** 광고 매체가 붙이는 클릭 식별자 (gclid / fbclid / 네이버 n_ad 등) */
  clickId: string
  /** 처음 들어온 페이지 경로 */
  landingPath: string
  referrer: string
  /** 처음 방문한 시각 (ISO 8601) */
  firstSeenAt: string
}

export const EMPTY_ATTRIBUTION: Attribution = {
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmTerm: '',
  utmContent: '',
  clickId: '',
  landingPath: '',
  referrer: '',
  firstSeenAt: '',
}

const COOKIE_NAME = 'nm_attr'
/** 90일. 공장 개보수는 검색하고 며칠 뒤에 연락하는 경우가 흔하다. */
const MAX_AGE_SEC = 60 * 60 * 24 * 90

/** 리퍼러 호스트를 우리가 쓰는 출처 이름으로 바꾼다. 모르는 곳은 호스트를 그대로 남긴다. */
export function sourceFromReferrer(referrer: string): string {
  if (!referrer) return 'direct'
  let host: string
  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'direct'
  }
  if (host.includes('naver.')) return 'naver'
  if (host.includes('google.')) return 'google'
  if (host.includes('daum.') || host.includes('kakao')) return 'daum'
  if (host.includes('instagram.')) return 'instagram'
  if (host.includes('facebook.') || host.includes('fb.')) return 'facebook'
  if (host.includes('bing.')) return 'bing'
  return host.replace(/^www\./, '')
}

function trim(value: string | null, max: number): string {
  return (value ?? '').trim().slice(0, max)
}

/** 현재 주소와 리퍼러에서 유입 정보를 읽는다. 브라우저에서만 호출한다. */
export function readFromLocation(): Attribution {
  if (typeof window === 'undefined') return EMPTY_ATTRIBUTION

  const params = new URLSearchParams(window.location.search)
  const referrer = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : ''
  const utmSource = trim(params.get('utm_source'), 60)

  const naverAd = params.has('n_media')

  return {
    utmSource: utmSource || (naverAd ? 'naver' : '') || sourceFromReferrer(referrer),
    utmMedium: trim(params.get('utm_medium'), 60) || (naverAd ? 'cpc' : ''),
    utmCampaign: trim(params.get('utm_campaign'), 120),
    // 네이버 검색광고는 연결 URL 이 소재 단위라 키워드를 utm_term 으로 못 박는다.
    // 대신 자동 추적을 켜면 `n_keyword` 로 실제 키워드가, `n_query` 로 검색어가 붙는다.
    utmTerm: trim(params.get('utm_term'), 120) || trim(params.get('n_keyword'), 120) || trim(params.get('n_query'), 120),
    utmContent: trim(params.get('utm_content'), 120) || trim(params.get('n_ad_group'), 120),
    clickId: trim(params.get('gclid'), 200) || trim(params.get('fbclid'), 200) || trim(params.get('n_ad'), 200) || '',
    landingPath: (window.location.pathname + window.location.search).slice(0, 300),
    referrer: referrer.slice(0, 300),
    firstSeenAt: new Date().toISOString(),
  }
}

/** 쿠키에 담긴 값을 꺼낸다. 없거나 깨졌으면 빈 값. */
export function loadAttribution(): Attribution {
  if (typeof document === 'undefined') return EMPTY_ATTRIBUTION
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1)
  if (!raw) return EMPTY_ATTRIBUTION
  try {
    return { ...EMPTY_ATTRIBUTION, ...(JSON.parse(decodeURIComponent(raw)) as Partial<Attribution>) }
  } catch {
    return EMPTY_ATTRIBUTION
  }
}

function save(value: Attribution) {
  const encoded = encodeURIComponent(JSON.stringify(value))
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=${encoded}; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure}`
}

/**
 * 방문할 때마다 불린다. 저장 규칙:
 *
 * - 주소에 utm 이 붙어 있으면 **덮어쓴다.** 돈을 낸 클릭이 가장 최근 접점이므로
 *   그 광고가 문의를 가져간 것으로 본다
 * - utm 이 없으면 이미 저장된 값을 **그대로 둔다.** 광고로 들어왔다가 며칠 뒤
 *   주소창에 직접 쳐서 들어와 문의하는 경우 광고가 지워지면 안 된다
 */
export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return EMPTY_ATTRIBUTION

  const existing = loadAttribution()
  const incoming = readFromLocation()
  const params = new URLSearchParams(window.location.search)
  // 네이버 광고 클릭은 utm 없이 n_media 만 붙어 올 수 있다. 그것도 유료 클릭으로 본다.
  const hasUtm = params.has('utm_source') || params.has('n_media')

  if (!hasUtm && existing.firstSeenAt) return existing

  // 첫 방문 시각은 처음 값을 지킨다 (광고를 언제 처음 봤는지)
  const next = { ...incoming, firstSeenAt: existing.firstSeenAt || incoming.firstSeenAt }
  save(next)
  return next
}

/** 출처 이름을 사람이 읽는 말로. 모르는 값은 그대로 보여준다. */
const SOURCE_LABELS: Record<string, string> = {
  naver: '네이버',
  google: '구글',
  daum: '다음',
  meta: '메타',
  instagram: '인스타그램',
  facebook: '페이스북',
  bing: '빙',
  direct: '직접 방문',
}

/**
 * 관리자 화면에 한 줄로 보여줄 유입 설명.
 * 예) "네이버 광고 · 공장 지붕 누수" · "직접 방문" · "" (기록 이전의 문의)
 */
export function attributionSummary(q: {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
}): string {
  const source = (q.utmSource ?? '').trim()
  if (!source) return ''

  const medium = (q.utmMedium ?? '').trim()
  const head = SOURCE_LABELS[source] ?? source
  const paid = medium === 'cpc' || medium === 'ppc' || medium === 'paid'

  return [paid ? `${head} 광고` : head, (q.utmTerm ?? '').trim() || (q.utmCampaign ?? '').trim()]
    .filter(Boolean)
    .join(' · ')
}
