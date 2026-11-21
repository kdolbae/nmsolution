import { pool } from '@/lib/db'
import { ensureClients, getClient } from '@/lib/clients/table'
import { calcMargin } from '@/lib/clients/margin'
import { OUTCOME_RESULTS, type Outcome, type OutcomeResult, type OutcomeRevision } from './shared'

/** 수주·실주 기록 표 (lib/outcomes/shared.ts 설명 참고). 표는 첫 조회 때 생긴다 */

let ready: Promise<void> | null = null

export function ensureOutcomes(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS nm_outcomes (
        client_id    bigint primary key references clients(id) on delete cascade,
        result       text not null,
        reasons      jsonb not null default '[]',
        note         text not null default '',
        rival_price  bigint,
        supply       bigint not null default 0,
        rate         numeric,
        categories   jsonb not null default '[]',
        recorded_by  text not null default '',
        recorded_at  timestamptz not null default now(),
        history      jsonb not null default '[]'
      )`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Db = {
  client_id: string
  client_name: string
  number: string | null
  result: string
  reasons: string[] | null
  note: string
  rival_price: string | null
  supply: string
  rate: string | null
  categories: string[] | null
  recorded_by: string
  recorded_at: Date
  history: OutcomeRevision[] | null
}

const SELECT = `SELECT o.*, c.name AS client_name, c.quote->>'number' AS number FROM nm_outcomes o JOIN clients c ON c.id = o.client_id`

const toOutcome = (r: Db): Outcome => ({
  clientId: Number(r.client_id),
  clientName: r.client_name,
  number: r.number ?? '',
  result: (OUTCOME_RESULTS as readonly string[]).includes(r.result) ? (r.result as OutcomeResult) : 'hold',
  reasons: Array.isArray(r.reasons) ? r.reasons : [],
  note: r.note,
  rivalPrice: r.rival_price === null ? null : Number(r.rival_price),
  supply: Number(r.supply),
  rate: r.rate === null ? null : Number(r.rate),
  categories: Array.isArray(r.categories) ? r.categories : [],
  by: r.recorded_by,
  at: r.recorded_at.toISOString(),
  history: Array.isArray(r.history) ? r.history : [],
})

export async function listOutcomes(): Promise<Outcome[]> {
  await ensureOutcomes()
  const { rows } = await pool.query<Db>(`${SELECT} ORDER BY o.recorded_at DESC`)
  return rows.map(toOutcome)
}

export async function getOutcome(clientId: number): Promise<Outcome | null> {
  await ensureOutcomes()
  const { rows } = await pool.query<Db>(`${SELECT} WHERE o.client_id = $1`, [clientId])
  return rows[0] ? toOutcome(rows[0]) : null
}

export type OutcomeInput = { result: OutcomeResult; reasons: string[]; note: string; rivalPrice: number | null }

/** 결과를 남기거나 고친다. 지금 견적의 공급가·영업이익률·공종을 같이 적고, 이전 기록은 history 에 쌓는다 */
export async function saveOutcome(clientId: number, input: OutcomeInput, by: string): Promise<void> {
  await ensureOutcomes()
  const client = await getClient(clientId)
  if (!client) throw new Error('없는 업체입니다.')
  const m = calcMargin(client.quote)
  const categories = [...new Set(client.quote.sections.map((s) => s.category?.split('-')[0]).filter((c): c is string => !!c))]
  await pool.query(
    `INSERT INTO nm_outcomes (client_id, result, reasons, note, rival_price, supply, rate, categories, recorded_by)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::jsonb, $9)
     ON CONFLICT (client_id) DO UPDATE SET
       history = nm_outcomes.history || jsonb_build_array(jsonb_build_object(
         'at', to_char(nm_outcomes.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'by', nm_outcomes.recorded_by, 'result', nm_outcomes.result, 'reasons', nm_outcomes.reasons, 'note', nm_outcomes.note)),
       result = EXCLUDED.result, reasons = EXCLUDED.reasons, note = EXCLUDED.note, rival_price = EXCLUDED.rival_price,
       supply = EXCLUDED.supply, rate = EXCLUDED.rate, categories = EXCLUDED.categories,
       recorded_by = EXCLUDED.recorded_by, recorded_at = now()`,
    [clientId, input.result, JSON.stringify(input.reasons), input.note, input.rivalPrice, Math.round(m.supply), m.supply > 0 ? Number(m.rate.toFixed(1)) : null, JSON.stringify(categories), by],
  )
}

export async function deleteOutcome(clientId: number): Promise<void> {
  await ensureOutcomes()
  await pool.query(`DELETE FROM nm_outcomes WHERE client_id = $1`, [clientId])
}
