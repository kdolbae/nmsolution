import { pool } from '@/lib/db'
import { ensureClients } from '@/lib/clients/table'
import { newExpenseItemId, normalizeExpense, type Expense, type ExpenseInput, type ExpenseItem } from './shared'

/**
 * 지출(원가) 기록 (전 업체 공통, kevin 2026-11-04 "이번 서울 지출에 반영").
 * 견적서 행(프로젝트)마다 거래명세서·영수증 단위로 쌓는다. 공급가·부가세·지급 여부, 품목은 선택.
 * 고객 자료에는 절대 안 나간다(어드민 전용). 계약 공급가 대비 지출 합계를 업체 페이지에서 보여 준다.
 */
let ready: Promise<void> | null = null

export function ensureExpenses(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS client_expenses (
        id         bigint generated always as identity primary key,
        client_id  bigint not null references clients(id) on delete cascade,
        seed_key   text unique,
        data       jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        updated_by text
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS client_expenses_client_idx ON client_expenses (client_id, (data->>'date'))`)
      await seedSeoulSaerom()
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

/** 2026-11-04 새롬판넬 거래명세서(프레치제, 서울 화곡동 처마) — 업체 '서울 차량 유리' 본 견적(/seoulglass)에 한 번만 넣는다 */
async function seedSeoulSaerom() {
  const key = 'seoulglass-saerom-261104'
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE portal_slug = 'seoulglass' AND parent_id IS NULL LIMIT 1`)
  if (!rows[0]) return
  const ea = (name: string, spec: string, qty: number, unit: string, price: number): ExpenseItem => ({ id: newExpenseItemId(), name, spec, qty, unit, price })
  const e: ExpenseInput = normalizeExpense({
    date: '2026-11-04',
    category: '자재',
    supplier: '(주)새롬판넬',
    title: '판넬·후레싱·도어·부자재 (거래명세서 2026-11-04)',
    paid: false,
    doc: '새롬판넬_거래명세서_261104.pdf',
    note: '파주공장(판넬·C/S 후레싱·도어·부자재)·김포-인천공장(G/I 앵글·선홈통). 성적서 없음. 외상(세금계산서 후 입금). 공급가 2,527,273 · VAT 252,727 · 합계 2,780,000.',
    items: [
      ea('100T EPS 난연2급 지붕 4골 청색', '양면 0.35T · 2,350×16장 + 3,000×1장', 40.6, 'm²', 19000),
      ea('100T EPS 난연2급 소골 아이보리', '양면 0.35T · 2,700×12장 + 3,000×3장', 41.4, 'm²', 17000),
      ea('부착형 물받이', 'C/S 후레싱 청색 0.4T · 150·250·150·120·50', 6, 'EA', 23700),
      ea('외부 앵글', 'C/S 후레싱 청색 0.4T · 80·350', 5, 'EA', 14400),
      ea('유바', 'C/S 후레싱 아이보리 0.4T · 40·100·40', 16, 'EA', 5500),
      ea('물끊기', 'C/S 후레싱 아이보리 0.4T · 120·200 각 140°', 5, 'EA', 9600),
      ea('100T S/W DOOR 4면 아이보리', '900×2100', 2, 'SET', 125000),
      ea('S.D.S 볼트', '180mm', 100, 'EA', 260),
      ea('지붕캡 청색', '', 50, 'EA', 220),
      ea('리벳', '4.8×16', 200, 'EA', 30),
      ea('앵글', 'G/I 후레싱 1.6T · 50·100 각 96° (김포-인천공장)', 6, 'EA', 14500),
      ea('슁글용 선홈통', '징크블랙', 1, 'EA', 12000),
      ea('매출할인', '', 1, '식', -127),
      ea('운임 (신용)', '5톤 1대', 1, '대', 190000),
      ea('운임 (신용)', '1톤 1대', 1, '대', 120000),
    ],
  })
  await pool.query(
    `INSERT INTO client_expenses (client_id, seed_key, data, updated_by) VALUES ($1, $2, $3, 'seed') ON CONFLICT (seed_key) DO NOTHING`,
    [rows[0].id, key, JSON.stringify(e)],
  )
}

type Db = { id: string; data: unknown; created_at: Date; updated_at: Date; updated_by: string | null }

const toExpense = (r: Db): Expense => {
  const e = normalizeExpense(r.data)
  return { ...e, id: Number(r.id), total: e.supply + e.vat, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(), updatedBy: r.updated_by ?? '' }
}

export async function listExpenses(clientId: number): Promise<Expense[]> {
  await ensureExpenses()
  const { rows } = await pool.query<Db>(
    `SELECT id, data, created_at, updated_at, updated_by FROM client_expenses WHERE client_id = $1 ORDER BY data->>'date' DESC, id DESC`,
    [clientId],
  )
  return rows.map(toExpense)
}

export async function insertExpense(clientId: number, input: ExpenseInput, by: string): Promise<number> {
  await ensureExpenses()
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO client_expenses (client_id, data, updated_by) VALUES ($1, $2, $3) RETURNING id`, [
    clientId,
    JSON.stringify(normalizeExpense(input)),
    by,
  ])
  return Number(rows[0].id)
}

export async function updateExpense(clientId: number, id: number, input: ExpenseInput, by: string): Promise<void> {
  await ensureExpenses()
  const { rowCount } = await pool.query(`UPDATE client_expenses SET data = $3, updated_by = $4, updated_at = now() WHERE client_id = $1 AND id = $2`, [
    clientId,
    id,
    JSON.stringify(normalizeExpense(input)),
    by,
  ])
  if (!rowCount) throw new Error('없는 지출 기록입니다.')
}

export async function deleteExpense(clientId: number, id: number): Promise<void> {
  await ensureExpenses()
  await pool.query(`DELETE FROM client_expenses WHERE client_id = $1 AND id = $2`, [clientId, id])
}
