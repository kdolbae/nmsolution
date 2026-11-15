import { pool } from '@/lib/db'
import { SEED_TECH } from './seed'
import { COMPARE_KEYS, TECH_STATUS, type TechCard, type TechInput, type TechRevision, type TechStatus } from './shared'

/** 기술 자료 표 (lib/tech/shared.ts 설명 참고). 표는 첫 조회 때 생기고 시드는 key 마다 한 번만 들어간다 */

let ready: Promise<void> | null = null
const FIELDS = ['summary', 'pros', 'cons', 'when', 'avoid', 'tips', 'defects', 'figures', 'source'] as const

export function ensureTech(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS nm_tech (
        id          bigint generated always as identity primary key,
        set_name    text not null,
        category    text not null default 'F6',
        name        text not null,
        data        jsonb not null default '{}',
        status      text not null default '미확인',
        updated_by  text not null default '',
        updated_at  timestamptz not null default now(),
        history     jsonb not null default '[]',
        seed_key    text unique
      )`)
      for (const { key, ...c } of SEED_TECH)
        await pool.query(
          `INSERT INTO nm_tech (set_name, category, name, data, status, updated_by, seed_key)
           VALUES ($1, $2, $3, $4::jsonb, $5, 'Claude', $6) ON CONFLICT (seed_key) DO NOTHING`,
          [c.set, c.category, c.name, JSON.stringify(dataOf(c)), c.status, key],
        )
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

function dataOf(c: TechInput) {
  const compare: Record<string, string> = {}
  for (const k of COMPARE_KEYS) if (c.compare[k]?.trim()) compare[k] = c.compare[k]!.trim()
  return { ...Object.fromEntries(FIELDS.map((f) => [f, c[f]])), compare }
}

type Db = {
  id: string
  set_name: string
  category: string
  name: string
  data: Record<string, unknown> | null
  status: string
  updated_by: string
  updated_at: Date
  history: TechRevision[] | null
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const toCard = (r: Db): TechCard => {
  const d = r.data ?? {}
  return {
    id: Number(r.id),
    set: r.set_name,
    category: r.category,
    name: r.name,
    summary: str(d.summary),
    pros: str(d.pros),
    cons: str(d.cons),
    when: str(d.when),
    avoid: str(d.avoid),
    tips: str(d.tips),
    defects: str(d.defects),
    figures: str(d.figures),
    source: str(d.source),
    status: (TECH_STATUS as readonly string[]).includes(r.status) ? (r.status as TechStatus) : '미확인',
    compare: d.compare && typeof d.compare === 'object' ? (d.compare as TechCard['compare']) : {},
    updatedBy: r.updated_by,
    updatedAt: r.updated_at.toISOString(),
    history: Array.isArray(r.history) ? r.history : [],
  }
}

export async function listTech(): Promise<TechCard[]> {
  await ensureTech()
  const { rows } = await pool.query<Db>(`SELECT * FROM nm_tech ORDER BY category, set_name, id`)
  return rows.map(toCard)
}

/** 새 카드를 넣거나(id 없음) 고친다. 고치면 이전 내용은 history 에 쌓인다 */
export async function saveTech(id: number | null, input: TechInput, by: string): Promise<number> {
  await ensureTech()
  const data = JSON.stringify(dataOf(input))
  if (!id) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO nm_tech (set_name, category, name, data, status, updated_by) VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING id`,
      [input.set, input.category, input.name, data, input.status, by],
    )
    return Number(rows[0].id)
  }
  await pool.query(
    `UPDATE nm_tech SET
       history = history || jsonb_build_array(jsonb_build_object(
         'at', to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'by', updated_by,
         'snapshot', (jsonb_build_object('name', name, 'status', status) || data)::text)),
       set_name = $2, category = $3, name = $4, data = $5::jsonb, status = $6, updated_by = $7, updated_at = now()
     WHERE id = $1`,
    [id, input.set, input.category, input.name, data, input.status, by],
  )
  return id
}

export async function deleteTech(id: number): Promise<void> {
  await ensureTech()
  await pool.query(`DELETE FROM nm_tech WHERE id = $1`, [id])
}
