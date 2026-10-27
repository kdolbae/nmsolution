import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { siteContent } from '@/lib/db/schema'

/**
 * 관리자 휴대폰 알림 (텔레그램 봇). TELEGRAM_BOT_TOKEN 이 없으면 아무것도 하지 않는다.
 *
 * 받는 사람: TELEGRAM_CHAT_ID(쉼표로 여러 명)가 있으면 그 대화방. 없으면 봇에게 먼저 말을 건
 * 개인 대화방을 getUpdates 로 찾아 site_content('telegram_chats')에 저장해 두고 계속 쓴다.
 */
const KEY = 'telegram_chats'
const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`

async function savedChats(): Promise<string[]> {
  const [row] = await db.select().from(siteContent).where(eq(siteContent.key, KEY)).limit(1)
  const ids = (row?.data as { ids?: unknown[] } | undefined)?.ids
  return Array.isArray(ids) ? ids.map(String) : []
}

async function findChats(token: string): Promise<string[]> {
  const res = await fetch(api(token, 'getUpdates'), { cache: 'no-store' })
  const body = (await res.json().catch(() => null)) as { result?: { message?: { chat?: { id?: number; type?: string } } }[] } | null
  const ids = [
    ...new Set(
      (body?.result ?? [])
        .map((u) => u.message?.chat)
        .filter((c) => c?.type === 'private' && c.id)
        .map((c) => String(c!.id)),
    ),
  ]
  if (ids.length) {
    const data = { ids }
    await db
      .insert(siteContent)
      .values({ key: KEY, data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteContent.key, set: { data, updatedAt: new Date() } })
  }
  return ids
}

export function telegramEnabled() {
  return !!process.env.TELEGRAM_BOT_TOKEN
}

/** 알림 한 통. 실패해도 던지지 않는다 */
export async function notifyAdmin(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    let chats = (process.env.TELEGRAM_CHAT_ID || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!chats.length) chats = await savedChats()
    if (!chats.length) chats = await findChats(token)
    if (!chats.length) return console.error('[telegram] 받을 대화방이 없음: 봇에게 먼저 아무 말이나 보내야 함')
    await Promise.all(
      chats.map((chat_id) =>
        fetch(api(token, 'sendMessage'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text, disable_web_page_preview: true }),
        }),
      ),
    )
  } catch (e) {
    console.error('[telegram]', e)
  }
}
