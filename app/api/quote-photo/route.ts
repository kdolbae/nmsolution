import { db, pool } from '@/lib/db'
import { quoteRequests } from '@/lib/db/schema'
import { after } from 'next/server'
import { sendToBoard } from '@/lib/board-sync'
import { isValidKoreanPhone } from '@/lib/quote'
import { ensureQuoteRequests } from '@/lib/quote-table'
import { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_TOTAL_BYTES, ensureQuotePhotos, sniffImage } from '@/lib/quote-photos'

export const dynamic = 'force-dynamic'

/**
 * 사진 견적 접수 (누수 랜딩 /leak 의 폼). 문의는 quote_requests 에, 사진은 quote_photos 에 넣는다.
 * 사진은 브라우저에서 긴 변 1600px JPEG 로 줄여서 온다. 여기서는 개수·크기·파일 앞머리만 다시 확인한다.
 * 관리자 → 견적 문의에서 사진과 함께 본다.
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

const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status })
const str = (v: FormDataEntryValue | null, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

export async function POST(req: Request) {
  let fd: FormData
  try {
    fd = await req.formData()
  } catch {
    return fail('사진이 너무 크거나 형식이 맞지 않습니다. 사진 수를 줄여 다시 보내 주세요.', 413)
  }

  // 봇이 채운 숨김 필드가 있으면 조용히 성공 처리한다
  if (str(fd.get('website'), 200)) return Response.json({ ok: true })

  const phone = str(fd.get('phone'), 40)
  const name = str(fd.get('name'), 100)
  const location = str(fd.get('location'), 200)
  const symptom = str(fd.get('symptom'), 200)
  const message = str(fd.get('message'), 4000)
  const from = str(fd.get('from'), 60) || 'leak_photo'

  if (!isValidKoreanPhone(phone)) return fail('연락처를 다시 확인해 주세요. 예: 010-1234-5678')

  const files = fd.getAll('photos').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f)
  if (files.length > MAX_PHOTOS) return fail(`사진은 ${MAX_PHOTOS}장까지 보낼 수 있습니다.`)
  const photos: { mime: string; data: Buffer }[] = []
  let total = 0
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return fail('사진 한 장이 너무 큽니다. 다른 사진으로 다시 골라 주세요.', 413)
    total += f.size
    if (total > MAX_TOTAL_BYTES) return fail('사진이 너무 많거나 큽니다. 사진 수를 줄여 주세요.', 413)
    const data = Buffer.from(await f.arrayBuffer())
    const mime = sniffImage(data)
    if (!mime) return fail('사진 파일만 보낼 수 있습니다 (JPG · PNG).')
    photos.push({ mime, data })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooSoon(ip)) return fail('방금 접수되었습니다. 잠시 후 다시 시도해 주세요.', 429)

  const body = [
    `[사진 견적 · 사진 ${photos.length}장 · ${from}]`,
    symptom && `증상: ${symptom}`,
    message,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    await ensureQuoteRequests()
    const [row] = await db
      .insert(quoteRequests)
      .values({
        name: name || '사진 견적',
        phone,
        location,
        categories: '누수 · 피해복구',
        message: body,
      })
      .returning({ id: quoteRequests.id, created_at: quoteRequests.createdAt })

    if (photos.length) {
      await ensureQuotePhotos()
      for (const p of photos) {
        await pool.query('INSERT INTO quote_photos (quote_id, mime, bytes, data) VALUES ($1, $2, $3, $4)', [
          row.id,
          p.mime,
          p.data.length,
          p.data,
        ])
      }
    }
    // 나노마스터 상황판으로 건수·시각만 보낸다(이름·연락처·사진은 안 나간다. lib/board-sync.ts)
    let page: string | null = null
    try {
      page = new URL(req.headers.get('referer') || '').pathname.slice(0, 300)
    } catch {}
    after(() => sendToBoard([], [{ id: row.id, created_at: row.created_at, kind: 'photo', phone, source_page: page }]).then(() => undefined))
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[quote-photo] 접수 실패', e)
    return fail('접수 중 문제가 발생했습니다. 전화나 카카오톡으로 사진을 보내 주세요.', 500)
  }
}
