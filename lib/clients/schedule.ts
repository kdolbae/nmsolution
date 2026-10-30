import { pool } from '@/lib/db'
import { ensureClients } from './table'
import { normalizeSteps, type Schedule, type ScheduleLog, type ScheduleStep } from './schedule-shared'

export * from './schedule-shared'

/**
 * 업체별 상세 공정. 어드민 업체 화면과 SBworks(연동 API)에서 함께 고친다.
 * 고칠 때마다 client_schedule_log 에 그때 공정 전체를 한 벌 남긴다(누가, 어디서 고쳤는지 포함).
 * sql/011_client_profiles.sql 과 같은 모양. 첫 조회 때 표가 생긴다.
 */

let ready: Promise<void> | null = null

export function ensureSchedules(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS client_schedules (
        client_id  bigint primary key references clients(id) on delete cascade,
        steps      jsonb not null default '[]'::jsonb,
        revision   int not null default 0,
        updated_by text,
        source     text,
        updated_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS client_schedule_log (
        id         bigint generated always as identity primary key,
        client_id  bigint not null references clients(id) on delete cascade,
        revision   int not null,
        steps      jsonb not null,
        summary    text,
        created_by text,
        source     text,
        created_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS client_schedule_log_client_idx ON client_schedule_log (client_id, revision)`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

export async function getSchedule(clientId: number): Promise<Schedule> {
  await ensureSchedules()
  const { rows } = await pool.query<{ steps: unknown; revision: number; updated_by: string | null; source: string | null; updated_at: Date }>(
    `SELECT steps, revision, updated_by, source, updated_at FROM client_schedules WHERE client_id = $1`,
    [clientId],
  )
  const r = rows[0]
  if (!r) return { steps: [], revision: 0, updatedAt: null, updatedBy: '', source: '' }
  return { steps: normalizeSteps(r.steps), revision: r.revision, updatedAt: r.updated_at.toISOString(), updatedBy: r.updated_by ?? '', source: r.source ?? '' }
}

export async function listScheduleLog(clientId: number): Promise<ScheduleLog[]> {
  await ensureSchedules()
  const { rows } = await pool.query<{ revision: number; created_at: Date; created_by: string | null; source: string | null; summary: string | null }>(
    `SELECT revision, created_at, created_by, source, summary FROM client_schedule_log WHERE client_id = $1 ORDER BY revision DESC LIMIT 100`,
    [clientId],
  )
  return rows.map((r) => ({ revision: r.revision, at: r.created_at.toISOString(), by: r.created_by ?? '', source: r.source ?? '', summary: r.summary ?? '' }))
}

/**
 * 공정 전체를 바꾼다. expectedRevision 을 주면 그 사이 다른 곳(어드민·SBworks)에서 고쳤을 때 덮어쓰지 않고 오류를 낸다.
 * 돌려주는 값은 새 revision.
 */
export async function saveSchedule(
  clientId: number,
  steps: ScheduleStep[],
  opts: { by: string; source: 'admin' | 'sbworks'; summary?: string; expectedRevision?: number | null },
): Promise<number> {
  await ensureSchedules()
  const conn = await pool.connect()
  try {
    await conn.query('BEGIN')
    await conn.query(`INSERT INTO client_schedules (client_id) VALUES ($1) ON CONFLICT DO NOTHING`, [clientId])
    const cur = await conn.query<{ revision: number }>(`SELECT revision FROM client_schedules WHERE client_id = $1 FOR UPDATE`, [clientId])
    const revision = cur.rows[0]?.revision ?? 0
    if (opts.expectedRevision != null && opts.expectedRevision !== revision) {
      throw new ScheduleConflict(revision)
    }
    const next = revision + 1
    await conn.query(`UPDATE client_schedules SET steps = $2, revision = $3, updated_by = $4, source = $5, updated_at = now() WHERE client_id = $1`, [
      clientId,
      JSON.stringify(steps),
      next,
      opts.by,
      opts.source,
    ])
    await conn.query(
      `INSERT INTO client_schedule_log (client_id, revision, steps, summary, created_by, source) VALUES ($1, $2, $3, $4, $5, $6)`,
      [clientId, next, JSON.stringify(steps), opts.summary ?? '공정 수정', opts.by, opts.source],
    )
    await conn.query('COMMIT')
    return next
  } catch (e) {
    await conn.query('ROLLBACK').catch(() => null)
    throw e
  } finally {
    conn.release()
  }
}

export class ScheduleConflict extends Error {
  constructor(public current: number) {
    super(`그 사이 공정이 바뀌었음(현재 ${current}차). 새로 불러온 뒤 다시 고쳐야 함.`)
  }
}

