import { pool } from '@/lib/db'
import { ensureClients } from '@/lib/clients/table'
import { normalizeMaterials, type MaterialItem, type MaterialList } from './shared'

/**
 * 자재 리스트 (전 업체 공통, kevin 2026-11-04 "어떤 자재가 필요한지 리스트업, 부자재 뭘 사야 하는지").
 * 견적서 행(프로젝트)마다 한 벌. 견적 재료비 줄에서 가져오고, Claude 로 부자재를 보강하고(lib/materials/generate.ts), 손으로 고친다.
 * 금액은 두지 않는다(구매 체크·구매처 묶기·문자용 복사까지). 발주서로 넘기는 건 다음 단계.
 */
let ready: Promise<void> | null = null

export function ensureMaterials(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS client_materials (
        client_id  bigint primary key references clients(id) on delete cascade,
        items      jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now(),
        updated_by text
      )`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

export async function getMaterials(clientId: number): Promise<MaterialList> {
  await ensureMaterials()
  const { rows } = await pool.query<{ items: unknown; updated_at: Date; updated_by: string | null }>(`SELECT items, updated_at, updated_by FROM client_materials WHERE client_id = $1`, [clientId])
  const r = rows[0]
  if (!r) return { items: [], updatedAt: null, updatedBy: '' }
  let items: MaterialItem[] = []
  try {
    items = normalizeMaterials(r.items)
  } catch {
    items = []
  }
  return { items, updatedAt: r.updated_at.toISOString(), updatedBy: r.updated_by ?? '' }
}

export async function saveMaterials(clientId: number, items: MaterialItem[], by: string): Promise<void> {
  await ensureMaterials()
  await pool.query(
    `INSERT INTO client_materials (client_id, items, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (client_id) DO UPDATE SET items = EXCLUDED.items, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [clientId, JSON.stringify(items), by],
  )
}
