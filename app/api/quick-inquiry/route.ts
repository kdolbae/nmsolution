import { db, pool } from '@/lib/db'
import { quoteRequests } from '@/lib/db/schema'
import { after } from 'next/server'
import { sendToBoard } from '@/lib/board-sync'
import { isValidKoreanPhone } from '@/lib/quote'
import { attributionValues, attributionSummary, type Attribution } from '@/lib/attribution'
import { ensureQuoteRequests } from '@/lib/quote-table'
import { MAX_PHOTO_BYTES, MAX_TOTAL_BYTES, ensureQuotePhotos, sniffImage } from '@/lib/quote-photos'
import { QUICK_MAX_PHOTOS, QUICK_WORKS } from '@/lib/quick-inquiry'
import { notifyInquiry } from '@/lib/notify/inquiry'
import { newChatToken, setChatToken } from '@/lib/inquiry-chat'

export const dynamic = 'force-dynamic'

/**
 * 우측 하단 간단 문의(3문답) 접수. quote_requests 에 form='quick' 으로 넣고, 사진은 quote_photos 에.
 * 광고 유입(키워드·검색어)을 함께 저장하고, 접수 즉시 관리자에게 텔레그램·카카오톡·메일로 알린다.
 */
const recent = new Map<string, number>()
const WINDOW_MS = 30_000

function tooSoon(key: string): boolean {
  const now = Date.now()
  for (const [k, t] of recent) if (now - t > WINDOW_MS) recent.delete(k)
  const last = recent.get(key)
  if (last && now - last < WINDOW_MS) return true
  recent.set(key, now)
  return false
}

const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status })
const str = (v: FormDataEntryValue | null, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

export async function POST(req: Request) {
  let fd: FormData
  try {
    fd = await req.formData()
  } catch {
    return fail('사진이 너무 큽니다. 사진을 빼고 다시 보내 주세요.', 413)
  }
  if (str(fd.get('website'), 200)) return Response.json({ ok: true })

  const sentWork = str(fd.get('work'), 40)
  const work = (QUICK_WORKS as readonly string[]).includes(sentWork) ? sentWork : '기타'
  const area = str(fd.get('area'), 60)
  const phone = str(fd.get('phone'), 40)
  const name = str(fd.get('name'), 100)
  const memo = str(fd.get('memo'), 500)
  if (!isValidKoreanPhone(phone)) return fail('연락처를 다시 확인해 주세요. 예: 010-1234-5678')

  let attribution: Partial<Attribution> | undefined
  try {
    const raw = str(fd.get('attribution'), 2000)
    if (raw) attribution = JSON.parse(raw) as Partial<Attribution>
  } catch {}

  const files = fd.getAll('photos').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f)
  if (files.length > QUICK_MAX_PHOTOS) return fail(`사진은 ${QUICK_MAX_PHOTOS}장까지 보낼 수 있습니다.`)
  const photos: { mime: string; data: Buffer }[] = []
  let total = 0
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return fail('사진 한 장이 너무 큽니다. 다른 사진을 골라 주세요.', 413)
    total += f.size
    if (total > MAX_TOTAL_BYTES) return fail('사진이 너무 큽니다. 사진 수를 줄여 주세요.', 413)
    const data = Buffer.from(await f.arrayBuffer())
    const mime = sniffImage(data)
    if (!mime) return fail('사진 파일만 보낼 수 있습니다 (JPG · PNG).')
    photos.push({ mime, data })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooSoon(ip)) return fail('방금 접수되었습니다. 잠시 후 다시 시도해 주세요.', 429)

  let page: string | null = null
  try {
    page = new URL(req.headers.get('referer') || '').pathname.slice(0, 300)
  } catch {}

  const attr = attributionValues(attribution)
  try {
    await ensureQuoteRequests()
    const [row] = await db
      .insert(quoteRequests)
      .values({
        name: name || '간단 문의',
        phone,
        location: area,
        categories: work,
        message: [`[간단 문의${photos.length ? ` · 사진 ${photos.length}장` : ''}]`, memo, page && `들어온 페이지 ${page}`].filter(Boolean).join('\n'),
        form: 'quick',
        ...attr,
      })
      .returning({ id: quoteRequests.id, created_at: quoteRequests.createdAt })

    if (photos.length) {
      await ensureQuotePhotos()
      for (const p of photos)
        await pool.query('INSERT INTO quote_photos (quote_id, mime, bytes, data) VALUES ($1, $2, $3, $4)', [row.id, p.mime, p.data.length, p.data])
    }

    // 손님이 이 문의로 계속 대화할 수 있게 비밀 토큰을 준다 (lib/inquiry-chat.ts)
    const token = newChatToken()
    await setChatToken(row.id, token)

    after(() => sendToBoard([], [{ id: row.id, created_at: row.created_at, kind: 'quote', phone, source_page: page }]).then(() => undefined))
    const source = attributionSummary(attr)
    after(() =>
      notifyInquiry({
        title: `간단 문의 · ${work} · ${area || '위치 미입력'}`,
        lines: [
          `연락처 ${phone}${name ? ` (${name})` : ''}`,
          photos.length ? `현장 사진 ${photos.length}장` : '',
          memo,
          source ? `유입 ${source}` : '',
          attr.searchQuery && attr.searchQuery !== attr.utmTerm ? `검색어 ${attr.searchQuery}` : '',
        ],
        tag: `quote-${row.id}`,
      }),
    )
    return Response.json({ ok: true, token })
  } catch (e) {
    console.error('[quick-inquiry] 접수 실패', e)
    return fail('접수 중 문제가 발생했습니다. 전화나 카카오톡으로 연락해 주세요.', 500)
  }
}
