'use server'

import { db } from '@/lib/db'
import { quoteRequests } from '@/lib/db/schema'
import { QUOTE_CATEGORIES, isValidKoreanPhone } from '@/lib/quote'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { ensureQuoteRequests } from '@/lib/quote-table'
import { sendToBoard } from '@/lib/board-sync'
import { notifyQuote } from '@/lib/notify'

export type QuoteInput = {
  name: string
  phone: string
  company: string
  location: string
  categories: string[]
  message: string
  /** 스팸 봇이 채우는 숨김 필드. 사람은 비워 둔다. */
  website?: string
}

export type QuoteResult = { ok: true } | { ok: false; error: string }

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

/** 문의가 나온 페이지(주소의 경로만). */
function pathOf(ref: string | null): string | null {
  try {
    return ref ? new URL(ref).pathname.slice(0, 300) : null
  } catch {
    return null
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

    await ensureQuoteRequests()
    const [row] = await db.insert(quoteRequests).values({
      name: name.slice(0, 100),
      phone: phone.slice(0, 40),
      company: (input.company ?? '').trim().slice(0, 100),
      location: (input.location ?? '').trim().slice(0, 200),
      categories: categories.join(','),
      message: message,
    }).returning({ id: quoteRequests.id, created_at: quoteRequests.createdAt })

    // 나노마스터 상황판으로 건수·시각만 보낸다(이름·연락처 원문은 안 나간다. lib/board-sync.ts)
    const page = pathOf(h.get('referer'))
    if (row) after(() => sendToBoard([], [{ id: row.id, created_at: row.created_at, kind: 'quote', phone, source_page: page }]).then(() => undefined))

    // 사업주에게 알림(폰 푸시 · 문자/알림톡). 키가 없으면 아무것도 안 한다(lib/notify.ts)
    if (row) {
      after(() => notifyQuote({
        id: row.id, name, phone, location: (input.location ?? '').trim().slice(0, 200),
        categories: categories.join(' · '), message, kind: 'quote',
      }).then(() => undefined))
    }

    return { ok: true }
  } catch (e) {
    console.error('[quote] 접수 실패', e)
    return { ok: false, error: '접수 중 문제가 발생했습니다. 전화나 카카오톡으로 연락해 주세요.' }
  }
}
