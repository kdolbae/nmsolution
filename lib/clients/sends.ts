import { pool } from '@/lib/db'
import { calcQuote, normalizeQuote, type Quote } from './quote'
import { ensureClients } from './table'

/**
 * 고객 발송본 (전 업체 공통, 2026-10-28 kevin).
 *
 * - 내부 버전(client_versions)은 저장할 때마다 쌓이는 작업본이고, 고객에게는 절대 보이지 않는다.
 * - 관리자가 '고객 발송본으로 확정'을 누를 때만 그 순간의 제안서·견적서를 이 표에 복사해 고정한다(이후 못 고침).
 * - 업체 페이지·협력업체 포털·고객 PDF 는 이 표만 읽는다. 발송본이 없으면 아무 견적도 보이지 않는다.
 * - 발송 견적번호: 첫 발송은 견적서 번호 그대로(NM-2610-04), 같은 번호로 다시 보내면 -R1, -R2 를 붙인다.
 * - 잘못 보낸 발송본은 '발송 취소'로 고객 화면에서만 내린다(기록은 남김).
 * 표는 첫 조회 때 생긴다(ensureClients 와 같은 방식).
 */

export type SendMeta = {
  no: number
  /** 고객에게 나간 견적번호 */
  number: string
  /** 견적서 원래 번호(발송 차수 붙이기 전) */
  baseNumber: string
  /** 복사해 온 내부 버전 (관리자만 봄) */
  version: number | null
  title: string
  supply: number
  grand: number
  note: string
  sentAt: Date
  sentBy: string
  withdrawnAt: Date | null
}

export type Send = SendMeta & { proposalHtml: string; quote: Quote }

let ready: Promise<void> | null = null

export function ensureSends(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS client_sends (
        id            bigint generated always as identity primary key,
        client_id     bigint not null references clients(id) on delete cascade,
        send_no       int not null,
        base_number   text not null,
        quote_number  text not null,
        version_no    int,
        title         text,
        supply        bigint,
        grand         bigint,
        proposal_html text,
        quote         jsonb,
        note          text,
        sent_at       timestamptz not null default now(),
        sent_by       text,
        withdrawn_at  timestamptz,
        withdrawn_by  text,
        unique (client_id, send_no)
      )`)
      await bootstrapSends()
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type SendDb = {
  send_no: number
  base_number: string
  quote_number: string
  version_no: number | null
  title: string | null
  supply: string | null
  grand: string | null
  note: string | null
  sent_at: Date
  sent_by: string | null
  withdrawn_at: Date | null
  proposal_html?: string | null
  quote?: unknown
}

function toMeta(r: SendDb): SendMeta {
  return {
    no: r.send_no,
    number: r.quote_number,
    baseNumber: r.base_number,
    version: r.version_no,
    title: r.title ?? '',
    supply: Number(r.supply ?? 0),
    grand: Number(r.grand ?? 0),
    note: r.note ?? '',
    sentAt: r.sent_at,
    sentBy: r.sent_by ?? '',
    withdrawnAt: r.withdrawn_at,
  }
}

const META_COLS = `send_no, base_number, quote_number, version_no, title, supply, grand, note, sent_at, sent_by, withdrawn_at`

/** 발송 이력 (최신이 먼저). withdrawn 까지 넣을지는 고른다. 관리자 화면은 전부, 고객 화면은 살아 있는 것만 */
export async function listSends(clientId: number, opts: { withWithdrawn?: boolean } = {}): Promise<SendMeta[]> {
  await ensureSends()
  const { rows } = await pool.query<SendDb>(
    `SELECT ${META_COLS} FROM client_sends WHERE client_id = $1 ${opts.withWithdrawn ? '' : 'AND withdrawn_at IS NULL'} ORDER BY send_no DESC`,
    [clientId],
  )
  return rows.map(toMeta)
}

/** 발송본 한 벌. 고객 화면에서 부를 때는 취소된 발송본을 돌려주지 않는다 */
export async function getSend(clientId: number, no: number, opts: { withWithdrawn?: boolean } = {}): Promise<Send | null> {
  if (!Number.isSafeInteger(clientId) || !Number.isSafeInteger(no)) return null
  await ensureSends()
  const { rows } = await pool.query<SendDb>(
    `SELECT ${META_COLS}, proposal_html, quote FROM client_sends WHERE client_id = $1 AND send_no = $2 ${opts.withWithdrawn ? '' : 'AND withdrawn_at IS NULL'}`,
    [clientId, no],
  )
  const r = rows[0]
  return r ? { ...toMeta(r), proposalHtml: r.proposal_html ?? '', quote: normalizeQuote(r.quote) } : null
}

/** 고객에게 보이는 최신 발송본 */
export async function latestSend(clientId: number): Promise<Send | null> {
  await ensureSends()
  const { rows } = await pool.query<{ send_no: number }>(
    `SELECT send_no FROM client_sends WHERE client_id = $1 AND withdrawn_at IS NULL ORDER BY send_no DESC LIMIT 1`,
    [clientId],
  )
  return rows[0] ? getSend(clientId, rows[0].send_no) : null
}

/** 같은 견적서 번호로 몇 번째 발송인지 보고 발송 견적번호를 정한다: 첫 발송은 그대로, 다음부터 -R1, -R2 */
export function sendNumber(base: string, earlierWithSameBase: number): string {
  return earlierWithSameBase > 0 ? `${base}-R${earlierWithSameBase}` : base
}

/** 제안서 안에 찍힌 견적번호를 발송 견적번호로 바꾼다(뒤에 -… 가 이어지는 다른 번호는 건드리지 않음) */
function stampNumber(html: string, base: string, number: string): string {
  if (!base || base === number) return html
  const re = new RegExp(`${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![-\\w])`, 'g')
  return html.replace(re, number)
}

/**
 * 내부 버전 하나를 고객 발송본으로 복사해 고정한다. 버전을 안 주면 지금 최신 버전.
 * 같은 버전을 연달아 다시 발송하면 거절한다(실수로 두 번 누름 방지).
 */
export async function createSend(
  clientId: number,
  by: string,
  opts: { version?: number; note?: string; sentAt?: Date } = {},
): Promise<SendMeta> {
  await ensureSends()
  return insertSend(clientId, by, opts)
}

/** createSend 본체. 표를 만드는 중(bootstrapSends)에도 부를 수 있게 ensureSends 를 기다리지 않는다 */
async function insertSend(clientId: number, by: string, opts: { version?: number; note?: string; sentAt?: Date }): Promise<SendMeta> {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    // 같은 업체 발송을 한 줄로 세운다
    await db.query(`SELECT id FROM clients WHERE id = $1 FOR UPDATE`, [clientId])
    const v = await db.query<{ version_no: number; proposal_html: string | null; quote: unknown; created_at: Date }>(
      opts.version
        ? `SELECT version_no, proposal_html, quote, created_at FROM client_versions WHERE client_id = $1 AND version_no = $2`
        : `SELECT version_no, proposal_html, quote, created_at FROM client_versions WHERE client_id = $1 ORDER BY version_no DESC LIMIT 1`,
      opts.version ? [clientId, opts.version] : [clientId],
    )
    const ver = v.rows[0]
    if (!ver) throw new Error('발송할 버전을 찾지 못했습니다.')
    const last = await db.query<{ send_no: number; version_no: number | null; withdrawn_at: Date | null }>(
      `SELECT send_no, version_no, withdrawn_at FROM client_sends WHERE client_id = $1 ORDER BY send_no DESC LIMIT 1`,
      [clientId],
    )
    if (last.rows[0] && !last.rows[0].withdrawn_at && last.rows[0].version_no === ver.version_no) {
      throw new Error(`v${ver.version_no} 은 이미 마지막 발송본입니다.`)
    }
    const quote = normalizeQuote(ver.quote)
    const base = quote.number
    const same = await db.query<{ n: string }>(`SELECT count(*) AS n FROM client_sends WHERE client_id = $1 AND base_number = $2`, [clientId, base])
    const number = sendNumber(base, Number(same.rows[0].n))
    const sentQuote: Quote = { ...quote, number }
    const proposal = stampNumber(ver.proposal_html ?? '', base, number)
    const calc = calcQuote(sentQuote)
    const { rows } = await db.query<SendDb>(
      `INSERT INTO client_sends (client_id, send_no, base_number, quote_number, version_no, title, supply, grand, proposal_html, quote, note, sent_at, sent_by)
       VALUES ($1, COALESCE((SELECT MAX(send_no) FROM client_sends WHERE client_id = $1), 0) + 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, now()), $12)
       RETURNING ${META_COLS}`,
      [clientId, base, number, ver.version_no, sentQuote.title, calc.supply, calc.grand, proposal, JSON.stringify(sentQuote), opts.note ?? '', opts.sentAt ?? null, by],
    )
    await db.query('COMMIT')
    return toMeta(rows[0])
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    db.release()
  }
}

/** 발송 취소: 고객 화면에서만 내린다. 기록과 발송 견적번호는 남는다 */
export async function withdrawSend(clientId: number, no: number, by: string) {
  await ensureSends()
  const { rowCount } = await pool.query(
    `UPDATE client_sends SET withdrawn_at = now(), withdrawn_by = $3 WHERE client_id = $1 AND send_no = $2 AND withdrawn_at IS NULL`,
    [clientId, no, by],
  )
  if (!rowCount) throw new Error('이미 취소했거나 없는 발송본입니다.')
}

/** 발송 취소를 되돌린다 */
export async function restoreSend(clientId: number, no: number) {
  await ensureSends()
  await pool.query(`UPDATE client_sends SET withdrawn_at = NULL, withdrawn_by = NULL WHERE client_id = $1 AND send_no = $2`, [clientId, no])
}

// ---------- 처음 한 번: 지금 열려 있는 업체 페이지를 1차 발송본으로 옮긴다 ----------

async function once(key: string, run: () => Promise<boolean | void>) {
  await pool.query(`CREATE TABLE IF NOT EXISTS client_seeds (key text primary key, created_at timestamptz not null default now())`)
  const done = await pool.query(`SELECT 1 FROM client_seeds WHERE key = $1`, [key])
  if (done.rows.length) return
  // false 를 돌려주면 아직 끝나지 않은 것(다음 조회 때 다시 본다)
  if ((await run()) === false) return
  await pool.query(`INSERT INTO client_seeds (key) VALUES ($1) ON CONFLICT DO NOTHING`, [key])
}

const ATOTECH_SLUG = 'atotech'

async function bootstrapSends() {
  // 업체 링크가 이미 나가 있던 업체는 고객이 보던 내용(최종본을 확정했으면 그 버전, 아니면 최신본)을 1차 발송본으로 둔다.
  // 아토텍은 아래에서 따로 넣는다(펌프 포함 견적 → 배관만 견적).
  await once('client-sends-v1-existing', async () => {
    const { rows } = await pool.query<{ id: string; finalized_version: number | null }>(
      `SELECT id, finalized_version FROM clients c
       WHERE portal_slug IS NOT NULL AND portal_slug <> $1
         AND NOT EXISTS (SELECT 1 FROM client_sends s WHERE s.client_id = c.id)`,
      [ATOTECH_SLUG],
    )
    for (const r of rows) {
      await insertSend(Number(r.id), 'system', {
        version: r.finalized_version ?? undefined,
        note: '발송 이력 기록 시작 전에 업체 링크로 보던 견적',
      }).catch((e) => console.error('client_sends bootstrap', r.id, e))
    }
  })
  await once('client-sends-v1-atotech', bootstrapAtotech)
}

/**
 * 아토텍코리아(2026-10-28 kevin): 지난번 보낸 펌프 교체 포함 견적을 1차 발송본(지난 견적)으로,
 * 펌프를 뺀 배관 구조 변경만 견적(PR #110)을 2차 발송본(최신)으로 둔다.
 * 배관만 견적이 아직 들어오지 않았으면 1차만 넣고 다음 조회 때 다시 본다.
 */
async function bootstrapAtotech(): Promise<boolean> {
  const c = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE portal_slug = $1`, [ATOTECH_SLUG])
  const id = c.rows[0] && Number(c.rows[0].id)
  if (!id) return true
  const vers = await pool.query<{ version_no: number; created_at: Date; pump: boolean }>(
    `SELECT version_no, created_at,
            EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(quote->'sections', '[]'::jsonb)) s WHERE s->>'name' LIKE '펌프 교체%') AS pump
       FROM client_versions WHERE client_id = $1 ORDER BY version_no`,
    [id],
  )
  const pump = [...vers.rows].reverse().find((v) => v.pump)
  const piping = pump ? [...vers.rows].reverse().find((v) => !v.pump && v.version_no > pump.version_no) : undefined
  const sent = async () =>
    (await pool.query<{ version_no: number | null }>(`SELECT version_no FROM client_sends WHERE client_id = $1 ORDER BY send_no`, [id])).rows
  if (!(await sent()).length && pump) {
    await insertSend(id, 'system', { version: pump.version_no, sentAt: pump.created_at, note: '펌프 교체 포함 견적 (지난 발송본)' })
  }
  if (!piping) return false
  const now = await sent()
  if (now.length === 1 && now[0].version_no === pump?.version_no) {
    await insertSend(id, 'system', { version: piping.version_no, note: '펌프 교체 제외, 배관 구조 변경만' })
  }
  return true
}
