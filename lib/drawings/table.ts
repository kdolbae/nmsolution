import { pool } from '@/lib/db'
import { ensureClients } from '@/lib/clients/table'

/**
 * 배관 도면 작성(관리자 → 배관 도면 작성). sql/011_drawings.sql 과 같은 모양.
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/clients/table.ts 와 같은 방식).
 *
 * - model: 도면 데이터(점·배관·부속·기기·라벨). 3D 화면(public/drawing-board/board.html)이 그대로 읽고 쓴다.
 * - 저장할 때마다 drawing_versions 에 그 전 모양을 한 벌 남긴다(되돌리기·이전 버전 불러오기).
 * - client_id + show_on_portal 이면 그 업체 페이지(예: /adreaming)에 보기 전용 3D 화면으로 나온다.
 */

export type DrawingModel = Record<string, unknown> & {
  nodes?: Record<string, [number, number, number]>
  lines?: Array<{ name?: string; path: string[] }>
}
export type ChatMsg = { role: 'user' | 'claude'; text: string; at: string; photos?: number }

export type Drawing = {
  id: number
  title: string
  clientId: number | null
  clientName: string | null
  clientSlug: string | null
  showOnPortal: boolean
  model: DrawingModel
  rev: number
  summary: string
  chat: ChatMsg[]
  updatedAt: Date
  updatedBy: string
}

export type DrawingMeta = Omit<Drawing, 'model' | 'chat'>

let ready: Promise<void> | null = null

export function ensureDrawings(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS drawings (
        id             bigint generated always as identity primary key,
        title          text not null,
        client_id      bigint references clients(id) on delete set null,
        show_on_portal boolean not null default false,
        sort           int not null default 0,
        model          jsonb not null default '{}'::jsonb,
        rev            int not null default 1,
        summary        text,
        chat           jsonb not null default '[]'::jsonb,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now(),
        updated_by     text
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS drawing_versions (
        id         bigint generated always as identity primary key,
        drawing_id bigint not null references drawings(id) on delete cascade,
        rev        int not null,
        model      jsonb not null,
        summary    text,
        created_by text,
        created_at timestamptz not null default now(),
        unique (drawing_id, rev)
      )`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Row = {
  id: string | number
  title: string
  client_id: string | number | null
  client_name: string | null
  client_slug: string | null
  show_on_portal: boolean
  model: DrawingModel
  rev: number
  summary: string | null
  chat: ChatMsg[]
  updated_at: Date
  updated_by: string | null
}

const SELECT = `SELECT d.*, c.name AS client_name, c.portal_slug AS client_slug FROM drawings d LEFT JOIN clients c ON c.id = d.client_id`

function toDrawing(r: Row): Drawing {
  return {
    id: Number(r.id),
    title: r.title,
    clientId: r.client_id == null ? null : Number(r.client_id),
    clientName: r.client_name,
    clientSlug: r.client_slug,
    showOnPortal: r.show_on_portal,
    model: r.model ?? {},
    rev: r.rev,
    summary: r.summary ?? '',
    chat: Array.isArray(r.chat) ? r.chat : [],
    updatedAt: r.updated_at,
    updatedBy: r.updated_by ?? '',
  }
}

export async function listDrawings(): Promise<DrawingMeta[]> {
  await ensureDrawings()
  const { rows } = await pool.query<Row>(`${SELECT} ORDER BY d.updated_at DESC`)
  return rows.map((r) => {
    const { model: _m, chat: _c, ...meta } = toDrawing(r)
    return meta
  })
}

export async function getDrawing(id: number): Promise<Drawing | null> {
  if (!Number.isSafeInteger(id)) return null
  await ensureDrawings()
  const { rows } = await pool.query<Row>(`${SELECT} WHERE d.id = $1`, [id])
  return rows[0] ? toDrawing(rows[0]) : null
}

/** 업체 페이지에 보일 도면들 (보기 전용) */
export async function portalDrawings(clientId: number): Promise<Drawing[]> {
  await ensureDrawings()
  const { rows } = await pool.query<Row>(`${SELECT} WHERE d.client_id = $1 AND d.show_on_portal ORDER BY d.sort, d.id`, [clientId])
  return rows.map(toDrawing)
}

export async function createDrawing(title: string, clientId: number | null, model: DrawingModel, by: string): Promise<number> {
  await ensureDrawings()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO drawings (title, client_id, model, summary, updated_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [title, clientId, JSON.stringify(model), '새 도면', by],
  )
  return Number(rows[0].id)
}

export class RevConflict extends Error {
  constructor(public current: Drawing) {
    super('다른 화면에서 먼저 고쳤습니다.')
  }
}

/**
 * 도면 저장. baseRev 가 지금 rev 와 다르면(다른 화면에서 먼저 고침) RevConflict.
 * 저장 전 모양은 drawing_versions 에 남긴다.
 */
export async function saveModel(id: number, model: DrawingModel, summary: string, by: string, baseRev: number): Promise<number> {
  await ensureDrawings()
  const c = await pool.connect()
  try {
    await c.query('BEGIN')
    const { rows } = await c.query<Row>(`SELECT * FROM drawings WHERE id = $1 FOR UPDATE`, [id])
    const cur = rows[0]
    if (!cur) throw new Error('없는 도면')
    if (cur.rev !== baseRev) {
      await c.query('ROLLBACK')
      throw new RevConflict((await getDrawing(id))!)
    }
    await c.query(
      `INSERT INTO drawing_versions (drawing_id, rev, model, summary, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [id, cur.rev, JSON.stringify(cur.model), cur.summary, cur.updated_by],
    )
    const next = cur.rev + 1
    await c.query(`UPDATE drawings SET model = $2, rev = $3, summary = $4, updated_by = $5, updated_at = now() WHERE id = $1`, [
      id,
      JSON.stringify(model),
      next,
      summary,
      by,
    ])
    await c.query('COMMIT')
    return next
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}

/** 바로 전 버전으로 되돌린다. 되돌린 것도 새 버전으로 남는다 */
export async function undoDrawing(id: number, by: string, baseRev: number): Promise<number | null> {
  await ensureDrawings()
  const { rows } = await pool.query<{ rev: number; model: DrawingModel; summary: string | null }>(
    `SELECT v.rev, v.model, v.summary FROM drawing_versions v JOIN drawings d ON d.id = v.drawing_id
     WHERE v.drawing_id = $1 AND v.rev < d.rev AND v.summary IS DISTINCT FROM '#되돌림-원본' ORDER BY v.rev DESC LIMIT 1`,
    [id],
  )
  const prev = rows[0]
  if (!prev) return null
  const rev = await saveModel(id, prev.model, `되돌림: 버전 ${prev.rev}(${prev.summary ?? ''})로`, by, baseRev)
  // 되돌린 버전 자체는 다음 되돌리기 대상에서 빼서 계속 뒤로 갈 수 있게 한다
  await pool.query(`UPDATE drawing_versions SET summary = '#되돌림-원본' WHERE drawing_id = $1 AND rev = $2`, [id, rev - 1])
  await pool.query(`DELETE FROM drawing_versions WHERE drawing_id = $1 AND rev = $2`, [id, prev.rev])
  return rev
}

export async function listDrawingVersions(id: number) {
  await ensureDrawings()
  const { rows } = await pool.query<{ rev: number; summary: string | null; created_by: string | null; created_at: Date }>(
    `SELECT rev, summary, created_by, created_at FROM drawing_versions WHERE drawing_id = $1 AND summary IS DISTINCT FROM '#되돌림-원본' ORDER BY rev DESC LIMIT 50`,
    [id],
  )
  return rows
}

export async function getDrawingVersion(id: number, rev: number): Promise<DrawingModel | null> {
  await ensureDrawings()
  const { rows } = await pool.query<{ model: DrawingModel }>(`SELECT model FROM drawing_versions WHERE drawing_id = $1 AND rev = $2`, [id, rev])
  return rows[0]?.model ?? null
}

export async function updateDrawingMeta(id: number, meta: { title?: string; clientId?: number | null; showOnPortal?: boolean }) {
  await ensureDrawings()
  const sets: string[] = []
  const vals: unknown[] = [id]
  if (meta.title !== undefined) sets.push(`title = $${vals.push(meta.title)}`)
  if (meta.clientId !== undefined) sets.push(`client_id = $${vals.push(meta.clientId)}`)
  if (meta.showOnPortal !== undefined) sets.push(`show_on_portal = $${vals.push(meta.showOnPortal)}`)
  if (!sets.length) return
  await pool.query(`UPDATE drawings SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, vals)
}

/** 화면 안 대화 기록(최근 60개)을 통째로 바꾼다 */
export async function setChat(id: number, msgs: ChatMsg[]) {
  await ensureDrawings()
  await pool.query(`UPDATE drawings SET chat = $2 WHERE id = $1`, [id, JSON.stringify(msgs.slice(-60))])
}

/** 되돌리기용 최근 버전들(모양 포함), 오래된 것부터 */
export async function recentVersions(id: number, limit = 15) {
  await ensureDrawings()
  const { rows } = await pool.query<{ rev: number; model: DrawingModel; summary: string | null }>(
    `SELECT rev, model, summary FROM drawing_versions WHERE drawing_id = $1 AND summary IS DISTINCT FROM '#되돌림-원본' ORDER BY rev DESC LIMIT $2`,
    [id, limit],
  )
  return rows.reverse().map((r) => ({ rev: r.rev, model: r.model, summary: r.summary ?? '' }))
}

export async function deleteDrawing(id: number) {
  await ensureDrawings()
  await pool.query(`DELETE FROM drawings WHERE id = $1`, [id])
}
