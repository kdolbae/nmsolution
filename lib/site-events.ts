'use client'

/**
 * 방문·유입·문의 기록 (우리 원장). 관리자 화면 /admin/stats 가 이걸로 채널·검색어별 성과를 본다.
 * 나노마스터(nanomaster.co.kr)의 site_events 와 같은 방식이다.
 *
 * - 첫 페이지의 유입 정보(utm·네이버 광고 검색어·referrer)를 세션에 기억해 두고, 같은 방문의 모든 기록에 붙인다.
 *   그래야 3페이지 뒤에 누른 전화도 "어느 광고로 들어온 사람"인지 안다.
 * - 이름·연락처 같은 개인정보는 보내지 않는다. 방문자 표식은 무작위 문자열이다.
 * - 관리자 화면을 연 적 있는 기기(사장님·직원)는 기록하지 않는다(localStorage nm-internal).
 */

type Kind = 'pageview' | 'leave' | 'call' | 'kakao' | 'form'
type Inflow = {
  source: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  ad_query?: string
  ad_rank?: number
}

const rand = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

function store(kind: 'local' | 'session', key: string, make?: () => string): string {
  try {
    const s = kind === 'local' ? localStorage : sessionStorage
    let v = s.getItem(key)
    if (!v && make) {
      v = make()
      s.setItem(key, v)
    }
    return v || ''
  } catch {
    return ''
  }
}

export function isInternal(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('nm_ignore')
    if (q === '1') localStorage.setItem('nm-internal', '1')
    if (q === '0') localStorage.removeItem('nm-internal')
    return localStorage.getItem('nm-internal') === '1'
  } catch {
    return false
  }
}

export function markInternal() {
  try {
    localStorage.setItem('nm-internal', '1')
  } catch {}
}

function refSource(ref: string): string {
  if (!ref) return 'direct'
  try {
    const h = new URL(ref).hostname
    if (h.endsWith(location.hostname)) return 'internal'
    if (/naver\./.test(h)) return 'naver'
    if (/google\./.test(h)) return 'google'
    if (/daum\.|kakao\./.test(h)) return 'daum'
    return h.replace(/^www\./, '')
  } catch {
    return 'other'
  }
}

/** 이 방문의 유입 정보. 처음 한 번 정하고 세션 동안 유지한다(내부 이동으로 덮어쓰지 않는다). */
function inflow(): Inflow {
  try {
    const saved = sessionStorage.getItem('nm-inflow')
    const q = new URLSearchParams(location.search)
    const fresh: Inflow = {
      source: refSource(document.referrer),
      utm_source: q.get('utm_source') || undefined,
      utm_medium: q.get('utm_medium') || undefined,
      utm_campaign: q.get('utm_campaign') || undefined,
      utm_content: q.get('utm_content') || undefined,
      utm_term: q.get('utm_term') || undefined,
      // 네이버 검색광고 '자동 추적 파라미터' 를 켜면 실제 검색어와 순위가 붙는다
      ad_query: q.get('n_query') || q.get('n_keyword') || undefined,
      ad_rank: q.get('n_rank') ? Number(q.get('n_rank')) : undefined,
    }
    // 새 광고 클릭(utm 이 붙은 주소)으로 다시 들어오면 새 유입으로 본다
    if (!saved || fresh.utm_source) {
      if (fresh.source === 'internal' && saved) return JSON.parse(saved)
      sessionStorage.setItem('nm-inflow', JSON.stringify(fresh))
      return fresh
    }
    return JSON.parse(saved)
  } catch {
    return { source: 'direct' }
  }
}

function send(type: Kind, extra: { label?: string; seconds?: number; scroll?: number } = {}) {
  if (typeof window === 'undefined' || location.pathname.startsWith('/admin') || isInternal()) return
  const body = JSON.stringify({
    type,
    ...extra,
    path: location.pathname,
    referrer: document.referrer || undefined,
    session_id: store('session', 'nm-sid', rand),
    visitor_id: store('local', 'nm-vid', rand),
    ...inflow(),
  })
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) return
  } catch {}
  fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
}

export const pageview = () => send('pageview')
export const leave = (seconds: number, scroll: number) => send('leave', { seconds, scroll })

/** Vercel Analytics 의 contact_click·quote_submitted 이름을 우리 전환 종류로 옮긴다. */
export function conversion(name: string, props?: Record<string, unknown>) {
  const ch = String(props?.channel || '')
  const label = [ch, props?.from].filter(Boolean).join(' · ') || undefined
  if (name === 'quote_submitted') return send('form', { label: String(props?.from || '') || undefined })
  if (name !== 'contact_click') return
  if (ch.startsWith('call')) send('call', { label })
  else if (ch.startsWith('kakao')) send('kakao', { label })
}
