'use server'

import { db } from '@/lib/db'
import { quoteRequests } from '@/lib/db/schema'
import { QUOTE_CATEGORIES } from '@/lib/quote'
import type { Attribution } from '@/lib/attribution'
import { headers } from 'next/headers'

export type QuoteInput = {
  name: string
  phone: string
  company: string
  location: string
  categories: string[]
  message: string
  /** 스팸 봇이 채우는 숨김 필드. 사람은 비워 둔다. */
  website?: string
  /** 어느 광고에서 온 방문인지. 브라우저 쿠키에서 읽어 보낸다. */
  attribution?: Partial<Attribution>
}

export type QuoteResult = { ok: true } | { ok: false; error: string }

/** 010-1234-5678, 01012345678, +82 10 ... 등을 숫자만 남겨 검사 */
function phoneDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, '').replace(/^82/, '0')
}

function isValidKoreanPhone(phone: string): boolean {
  const d = phoneDigits(phone)
  // 휴대전화 010~019 (10~11자리), 지역번호/대표번호 (9~12자리)
  return /^0\d{8,11}$/.test(d)
}

/**
 * 같은 IP에서 짧은 시간에 반복 접수되는 것을 막는다.
 * 서버 인스턴스 메모리에만 두므로 완벽하지는 않지만, 단순 스팸에는 충분하다.
 */
const recent = new Map<string, number>()
const WINDOW_MS = 60_000

function tooSoon(key: string): boolean {
  const now = Date.now()
  for (const [k, t] of recent) if (now - t > WINDOW_MS) recent.delete(k)
  const last = recent.get(key)
  if (last && now - last < WINDOW_MS) return true
  recent.set(key, now)
  return false
}

/** 브라우저가 보낸 유입 정보를 길이만 잘라 저장 형태로 바꾼다. 없으면 빈 값이 들어간다. */
function attributionValues(a: Partial<Attribution> | undefined) {
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  // 값을 못 믿을 이유는 없지만 클라이언트가 보낸 문자열이므로 길이는 잘라 둔다
  const firstSeen = typeof a?.firstSeenAt === 'string' ? new Date(a.firstSeenAt) : null
  return {
    utmSource: s(a?.utmSource, 60),
    utmMedium: s(a?.utmMedium, 60),
    utmCampaign: s(a?.utmCampaign, 120),
    utmTerm: s(a?.utmTerm, 120),
    utmContent: s(a?.utmContent, 120),
    clickId: s(a?.clickId, 200),
    landingPath: s(a?.landingPath, 300),
    referrer: s(a?.referrer, 300),
    firstSeenAt: firstSeen && !Number.isNaN(firstSeen.getTime()) ? firstSeen : null,
  }
}

export async function submitQuote(input: QuoteInput): Promise<QuoteResult> {
  // 봇이 채운 숨김 필드가 있으면 조용히 성공 처리한다 (재시도를 유도하지 않는다)
  if (input.website) return { ok: true }

  const name = (input.name ?? '').trim()
  const phone = (input.phone ?? '').trim()
  const message = (input.message ?? '').trim()

  if (name.length < 2) return { ok: false, error: '성함을 2자 이상 입력해 주세요.' }
  if (!isValidKoreanPhone(phone)) return { ok: false, error: '연락처를 다시 확인해 주세요. 예: 010-1234-5678' }
  if (message.length > 4000) return { ok: false, error: '문의 내용이 너무 깁니다. 4000자 이내로 줄여 주세요.' }

  // 목록에 없는 값이 들어오면 버린다
  const categories = (input.categories ?? []).filter((c) => (QUOTE_CATEGORIES as readonly string[]).includes(c))

  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (tooSoon(ip)) {
      return { ok: false, error: '방금 접수되었습니다. 잠시 후 다시 시도해 주세요.' }
    }

    await db.insert(quoteRequests).values({
      name: name.slice(0, 100),
      phone: phone.slice(0, 40),
      company: (input.company ?? '').trim().slice(0, 100),
      location: (input.location ?? '').trim().slice(0, 200),
      categories: categories.join(','),
      message: message,
      ...attributionValues(input.attribution),
    })

    return { ok: true }
  } catch (e) {
    console.error('[quote] 접수 실패', e)
    return { ok: false, error: '접수 중 문제가 발생했습니다. 전화나 카카오톡으로 연락해 주세요.' }
  }
}
