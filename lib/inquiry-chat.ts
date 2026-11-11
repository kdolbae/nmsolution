import { randomBytes } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureQuoteRequests } from '@/lib/quote-table'

/**
 * 간단 문의 대화. 손님이 접수하면 문의마다 비밀 토큰(chat_token)을 만들어 브라우저에 준다.
 * 손님은 그 토큰으로만 자기 대화를 읽고 쓴다(로그인 없음). 관리자는 견적 문의 화면에서 답한다.
 */
export type ChatMessage = { id: number; sender: 'customer' | 'admin'; body: string; created_at: string }

let ready: Promise<void> | null = null

export function ensureInquiryChat(): Promise<void> {
  if (!ready) {
    ready = ensureQuoteRequests()
      .then(() =>
        pool.query(
          `ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS chat_token text NOT NULL DEFAULT '';
           CREATE TABLE IF NOT EXISTS inquiry_messages (
             id         serial PRIMARY KEY,
             quote_id   integer NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
             sender     text NOT NULL CHECK (sender IN ('customer','admin')),
             body       text NOT NULL,
             read_at    timestamptz,
             created_at timestamptz NOT NULL DEFAULT now()
           );
           CREATE INDEX IF NOT EXISTS inquiry_messages_quote_idx ON inquiry_messages (quote_id, id);`,
        ),
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}

export function newChatToken() {
  return randomBytes(24).toString('base64url')
}

export async function setChatToken(quoteId: number, token: string) {
  await ensureInquiryChat()
  await pool.query('UPDATE quote_requests SET chat_token = $2 WHERE id = $1', [quoteId, token])
}

/** 토큰 → 문의 id. 없거나 짧으면 null */
export async function quoteByToken(token: string): Promise<{ id: number; categories: string; location: string } | null> {
  if (!token || token.length < 20) return null
  await ensureInquiryChat()
  const { rows } = await pool.query<{ id: number; categories: string; location: string }>(
    'SELECT id, categories, location FROM quote_requests WHERE chat_token = $1 LIMIT 1',
    [token],
  )
  return rows[0] ?? null
}

export async function listMessages(quoteId: number): Promise<ChatMessage[]> {
  await ensureInquiryChat()
  const { rows } = await pool.query<ChatMessage>(
    'SELECT id, sender, body, created_at FROM inquiry_messages WHERE quote_id = $1 ORDER BY id LIMIT 500',
    [quoteId],
  )
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }))
}

export async function addMessage(quoteId: number, sender: 'customer' | 'admin', body: string) {
  await ensureInquiryChat()
  const { rows } = await pool.query<{ id: number }>(
    'INSERT INTO inquiry_messages (quote_id, sender, body) VALUES ($1, $2, $3) RETURNING id',
    [quoteId, sender, body.slice(0, 2000)],
  )
  return rows[0].id
}

/** 한쪽이 대화를 읽으면 상대가 보낸 메시지를 읽음 처리 */
export async function markRead(quoteId: number, reader: 'customer' | 'admin') {
  await pool.query(
    'UPDATE inquiry_messages SET read_at = now() WHERE quote_id = $1 AND sender <> $2 AND read_at IS NULL',
    [quoteId, reader],
  )
}

/** 관리자 화면용: 문의 id → 메시지 목록 */
export async function messagesByQuote(): Promise<Record<number, ChatMessage[]>> {
  try {
    await ensureInquiryChat()
    const { rows } = await pool.query<ChatMessage & { quote_id: number }>(
      `SELECT id, quote_id, sender, body, created_at FROM inquiry_messages
        WHERE quote_id IN (SELECT id FROM quote_requests ORDER BY id DESC LIMIT 300) ORDER BY id`,
    )
    const out: Record<number, ChatMessage[]> = {}
    for (const r of rows)
      (out[r.quote_id] ??= []).push({ id: r.id, sender: r.sender, body: r.body, created_at: new Date(r.created_at).toISOString() })
    return out
  } catch (e) {
    console.error('[inquiry-chat] 조회 실패', e)
    return {}
  }
}
