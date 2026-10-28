import { pool } from '@/lib/db'
import { randomBytes } from 'node:crypto'
import { normalizeQuote, type Quote } from '@/lib/clients/quote'

/**
 * AI 견적 접수 (2026-10-28 kevin). 현장 자료(사진·문서)와 설명을 올리면 Claude 가 공사 유형·방향을 잡고
 * 견적에 필요한 질문을 하며, 답을 모아 제안서·견적서 초안을 만든다. 초안은 업체 관리의 제안서·견적서로 넣는다.
 *
 * quote_intakes 한 건 = 접수 한 건. 대화·분석·초안은 jsonb 로 둔다.
 * intake_files = 올린 사진·문서(bytea). 관리자만 읽고, 제안서에 넣은 사진만 열쇠(key)가 있는 주소로 내보낸다.
 * 표는 첫 조회 때 생긴다(lib/clients/table.ts 와 같은 방식).
 */

export type IntakeMessage = { role: 'assistant' | 'user'; text: string; at: string }

export type IntakeAnalysis = {
  /** 공사 카테고리 소분류 코드·이름 (lib/intake/work-categories.json) */
  types: { code: string; name: string; why: string }[]
  /** 공사 방향·제안 공법 한 단락 */
  direction: string
  /** 자료에서 읽은 현황 요약 */
  summary: string
  /** 아직 답을 못 받은 질문 */
  questions: string[]
  /** 지금까지 확정된 사실 (답 모음) */
  facts: string[]
  /** 더 물을 게 없어 초안을 만들 수 있는지 */
  ready: boolean
}

export type IntakeDraft = {
  proposal: {
    title: string
    oneLine: string
    current: string
    direction: string
    scope: string[]
    steps: { title: string; text: string }[]
    period: string
    excluded: string[]
    photoIds: number[]
  }
  quote: Quote
  /** 견적자가 확인할 점 */
  checks: string[]
  madeAt: string
}

export type Intake = {
  id: number
  title: string
  description: string
  clientId: number | null
  analysis: IntakeAnalysis | null
  messages: IntakeMessage[]
  draft: IntakeDraft | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type IntakeFile = { id: number; intakeId: number; name: string; mime: string; bytes: number; caption: string; key: string; createdAt: Date }

let ready: Promise<void> | null = null

export function ensureIntakes(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS quote_intakes (
        id          bigint generated always as identity primary key,
        title       text not null default '',
        description text not null default '',
        client_id   bigint,
        analysis    jsonb,
        messages    jsonb not null default '[]',
        draft       jsonb,
        created_by  text,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS intake_files (
        id         bigint generated always as identity primary key,
        intake_id  bigint not null references quote_intakes(id) on delete cascade,
        name       text not null,
        mime       text not null,
        bytes      integer not null,
        data       bytea not null,
        caption    text not null default '',
        key        text not null,
        created_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS intake_files_intake_idx ON intake_files (intake_id)`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Row = {
  id: string
  title: string
  description: string
  client_id: string | null
  analysis: unknown
  messages: unknown
  draft: unknown
  created_by: string | null
  created_at: Date
  updated_at: Date
}

function toIntake(r: Row): Intake {
  const draft = r.draft && typeof r.draft === 'object' ? (r.draft as IntakeDraft) : null
  return {
    id: Number(r.id),
    title: r.title,
    description: r.description,
    clientId: r.client_id ? Number(r.client_id) : null,
    analysis: r.analysis && typeof r.analysis === 'object' ? (r.analysis as IntakeAnalysis) : null,
    messages: Array.isArray(r.messages) ? (r.messages as IntakeMessage[]) : [],
    draft: draft ? { ...draft, quote: normalizeQuote(draft.quote) } : null,
    createdBy: r.created_by ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listIntakes(): Promise<(Intake & { files: number })[]> {
  await ensureIntakes()
  const { rows } = await pool.query<Row & { files: string }>(
    `SELECT i.*, (SELECT count(*) FROM intake_files f WHERE f.intake_id = i.id) AS files FROM quote_intakes i ORDER BY updated_at DESC`,
  )
  return rows.map((r) => ({ ...toIntake(r), files: Number(r.files) }))
}

export async function getIntake(id: number): Promise<Intake | null> {
  if (!Number.isSafeInteger(id)) return null
  await ensureIntakes()
  const { rows } = await pool.query<Row>(`SELECT * FROM quote_intakes WHERE id = $1`, [id])
  return rows[0] ? toIntake(rows[0]) : null
}

export async function createIntake(by: string, title = ''): Promise<number> {
  await ensureIntakes()
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO quote_intakes (title, created_by) VALUES ($1, $2) RETURNING id`, [title, by])
  return Number(rows[0].id)
}

export async function updateIntake(
  id: number,
  patch: Partial<Pick<Intake, 'title' | 'description' | 'clientId' | 'analysis' | 'messages' | 'draft'>>,
) {
  await ensureIntakes()
  const sets: string[] = []
  const vals: unknown[] = []
  const put = (col: string, v: unknown) => {
    vals.push(v)
    sets.push(`${col} = $${vals.length}`)
  }
  if (patch.title !== undefined) put('title', patch.title)
  if (patch.description !== undefined) put('description', patch.description)
  if (patch.clientId !== undefined) put('client_id', patch.clientId)
  if (patch.analysis !== undefined) put('analysis', patch.analysis ? JSON.stringify(patch.analysis) : null)
  if (patch.messages !== undefined) put('messages', JSON.stringify(patch.messages))
  if (patch.draft !== undefined) put('draft', patch.draft ? JSON.stringify(patch.draft) : null)
  if (!sets.length) return
  vals.push(id)
  await pool.query(`UPDATE quote_intakes SET ${sets.join(', ')}, updated_at = now() WHERE id = $${vals.length}`, vals)
}

export async function removeIntake(id: number) {
  await ensureIntakes()
  await pool.query(`DELETE FROM quote_intakes WHERE id = $1`, [id])
}

// ---------- 파일 ----------

const FILE_COLS = `id, intake_id, name, mime, bytes, caption, key, created_at`
type FileRow = { id: string; intake_id: string; name: string; mime: string; bytes: number; caption: string; key: string; created_at: Date; data?: Buffer }

function toFile(r: FileRow): IntakeFile {
  return { id: Number(r.id), intakeId: Number(r.intake_id), name: r.name, mime: r.mime, bytes: r.bytes, caption: r.caption, key: r.key, createdAt: r.created_at }
}

export async function listFiles(intakeId: number): Promise<IntakeFile[]> {
  await ensureIntakes()
  const { rows } = await pool.query<FileRow>(`SELECT ${FILE_COLS} FROM intake_files WHERE intake_id = $1 ORDER BY id`, [intakeId])
  return rows.map(toFile)
}

export async function addFile(intakeId: number, name: string, mime: string, data: Buffer, caption = ''): Promise<IntakeFile> {
  await ensureIntakes()
  const key = randomBytes(12).toString('base64url')
  const { rows } = await pool.query<FileRow>(
    `INSERT INTO intake_files (intake_id, name, mime, bytes, data, caption, key) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${FILE_COLS}`,
    [intakeId, name, mime, data.length, data, caption, key],
  )
  await pool.query(`UPDATE quote_intakes SET updated_at = now() WHERE id = $1`, [intakeId])
  return toFile(rows[0])
}

export async function setCaption(fileId: number, caption: string) {
  await ensureIntakes()
  await pool.query(`UPDATE intake_files SET caption = $2 WHERE id = $1`, [fileId, caption])
}

export async function removeFile(fileId: number) {
  await ensureIntakes()
  await pool.query(`DELETE FROM intake_files WHERE id = $1`, [fileId])
}

/** 파일 본문. key 를 주면 열쇠가 맞을 때만 돌려준다(제안서 사진처럼 로그인 없이 보는 경우) */
export async function readFile(fileId: number, key?: string): Promise<(IntakeFile & { data: Buffer }) | null> {
  if (!Number.isSafeInteger(fileId)) return null
  await ensureIntakes()
  const { rows } = await pool.query<FileRow>(`SELECT ${FILE_COLS}, data FROM intake_files WHERE id = $1`, [fileId])
  const r = rows[0]
  if (!r || (key !== undefined && r.key !== key)) return null
  return { ...toFile(r), data: r.data as Buffer }
}

/** 접수의 사진·문서를 Claude 에 보낼 때 쓴다 (본문 포함) */
export async function readFiles(intakeId: number): Promise<(IntakeFile & { data: Buffer })[]> {
  await ensureIntakes()
  const { rows } = await pool.query<FileRow>(`SELECT ${FILE_COLS}, data FROM intake_files WHERE intake_id = $1 ORDER BY id`, [intakeId])
  return rows.map((r) => ({ ...toFile(r), data: r.data as Buffer }))
}
