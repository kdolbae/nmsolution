'use server'

import { getSession } from '@/lib/admin'
import { pool } from '@/lib/db'
import { boardSyncEnabled, sendToBoard, type BoardEvent, type BoardInquiry } from '@/lib/board-sync'
import { ensureSiteEvents } from '@/lib/site-events-table'
import { ensureQuoteRequests } from '@/lib/quote-table'

export type SyncResult = { ok: true; events: number; inquiries: number } | { ok: false; error: string }

const BATCH = 500

/**
 * 지난 기록 전부를 나노마스터 상황판으로 다시 보낸다(lib/board-sync.ts).
 * 이미 간 줄은 그쪽에서 한 번만 남으므로 여러 번 눌러도 된다. 문의는 건수·시각·번호 해시만 간다.
 */
export async function syncBoardHistory(): Promise<SyncResult> {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: '로그인이 필요합니다.' }
  if (!boardSyncEnabled()) return { ok: false, error: '서버에 NM_BOARD_KEY 가 없어 보낼 수 없습니다.' }
  try {
    await Promise.all([ensureSiteEvents(), ensureQuoteRequests()])
    let events = 0
    for (let last = 0; ; ) {
      const { rows } = await pool.query<BoardEvent>('SELECT * FROM site_events WHERE id > $1 ORDER BY id LIMIT $2', [last, BATCH])
      if (!rows.length) break
      if (!(await sendToBoard(rows))) return { ok: false, error: `방문 기록 ${events}줄까지 보내고 멈췄습니다. 다시 눌러 주세요.` }
      events += rows.length
      last = Number(rows[rows.length - 1].id)
    }
    let inquiries = 0
    for (let last = 0; ; ) {
      const { rows } = await pool.query<BoardInquiry>(
        `SELECT id, created_at, CASE WHEN message LIKE '[사진 견적%' THEN 'photo' ELSE 'quote' END AS kind, phone
           FROM quote_requests WHERE id > $1 ORDER BY id LIMIT $2`,
        [last, BATCH],
      )
      if (!rows.length) break
      if (!(await sendToBoard([], rows))) return { ok: false, error: `문의 ${inquiries}건까지 보내고 멈췄습니다. 다시 눌러 주세요.` }
      inquiries += rows.length
      last = rows[rows.length - 1].id
    }
    return { ok: true, events, inquiries }
  } catch (e) {
    console.error('[board-sync] 지난 기록 보내기 실패', e)
    return { ok: false, error: '보내는 중 문제가 생겼습니다.' }
  }
}
