'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { addMessage, listMessages, markRead, type ChatMessage } from '@/lib/inquiry-chat'
import { pushCustomer } from '@/lib/notify/push'

/** 관리자가 간단 문의 손님에게 답장한다. 손님이 알림을 켜 두었으면 휴대폰으로도 간다 */
export async function replyInquiry(quoteId: number, body: string): Promise<{ ok: boolean; messages?: ChatMessage[]; error?: string }> {
  await requireAdmin()
  const text = body.trim()
  if (!text) return { ok: false, error: '내용을 적어 주세요.' }
  try {
    await addMessage(quoteId, 'admin', text)
    await markRead(quoteId, 'admin')
    after(() => pushCustomer(quoteId, { title: '엔엠솔루션 답장', body: text, url: '/?chat=1', tag: `reply-${quoteId}` }))
    revalidatePath('/admin/quotes')
    return { ok: true, messages: await listMessages(quoteId) }
  } catch (e) {
    console.error('[reply] 실패', e)
    return { ok: false, error: '보내지 못했습니다.' }
  }
}

/** 관리자가 대화를 열어 보면 손님 메시지를 읽음 처리 */
export async function readInquiry(quoteId: number) {
  await requireAdmin()
  await markRead(quoteId, 'admin').catch(() => undefined)
}
