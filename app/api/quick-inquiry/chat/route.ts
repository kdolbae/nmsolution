import { after } from 'next/server'
import { addMessage, listMessages, markRead, quoteByToken } from '@/lib/inquiry-chat'
import { notifyInquiry } from '@/lib/notify/inquiry'
import { saveSubscription, validSub } from '@/lib/notify/push'

export const dynamic = 'force-dynamic'

/**
 * 손님 쪽 대화 (간단 문의 박스). 접수 때 받은 토큰으로만 열린다.
 * GET ?t=토큰 → 메시지 목록 (읽으면 관리자 답장을 읽음 처리)
 * POST {t, body} → 손님 메시지 추가 + 관리자 알림
 * POST {t, sub}  → 이 문의의 답장 푸시 알림 받기
 */
const recent = new Map<string, number[]>()
function tooMany(token: string) {
  const now = Date.now()
  const list = (recent.get(token) ?? []).filter((t) => now - t < 60_000)
  list.push(now)
  recent.set(token, list)
  return list.length > 8
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('t') || ''
  try {
    const q = await quoteByToken(t)
    if (!q) return Response.json({ ok: false }, { status: 404 })
    const messages = await listMessages(q.id)
    if (new URL(req.url).searchParams.get('read') === '1') await markRead(q.id, 'customer')
    return Response.json({ ok: true, messages }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[quick-inquiry/chat] 조회 실패', e)
    return Response.json({ ok: false }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const data = (await req.json().catch(() => null)) as { t?: string; body?: string; sub?: unknown } | null
  try {
    const q = await quoteByToken(data?.t || '')
    if (!q) return Response.json({ ok: false, error: '문의를 찾을 수 없습니다. 새로 남겨 주세요.' }, { status: 404 })

    if (data?.sub !== undefined) {
      if (!validSub(data.sub)) return Response.json({ ok: false, error: '알림 등록에 실패했습니다.' }, { status: 400 })
      await saveSubscription(data.sub, 'customer', q.id)
      return Response.json({ ok: true })
    }

    const body = (data?.body ?? '').trim().slice(0, 2000)
    if (!body) return Response.json({ ok: false, error: '내용을 적어 주세요.' }, { status: 400 })
    if (tooMany(data!.t!)) return Response.json({ ok: false, error: '잠시 후 다시 보내 주세요.' }, { status: 429 })
    await addMessage(q.id, 'customer', body)
    after(() =>
      notifyInquiry({
        title: `간단 문의 새 메시지 · ${q.categories}${q.location ? ` · ${q.location}` : ''}`,
        lines: [body.slice(0, 500)],
        tag: `quote-${q.id}`,
      }),
    )
    return Response.json({ ok: true, messages: await listMessages(q.id) })
  } catch (e) {
    console.error('[quick-inquiry/chat] 저장 실패', e)
    return Response.json({ ok: false, error: '보내지 못했습니다. 전화로 연락해 주세요.' }, { status: 500 })
  }
}
