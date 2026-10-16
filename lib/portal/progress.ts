import { pool } from '@/lib/db'
import { ensureClients } from '@/lib/clients/table'

/**
 * 공정 진행 공유: 공정표(project_tasks) · 일일 보고(daily_reports) · 현장 사진(report_photos).
 * sql/010_progress.sql 과 같은 모양. 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다.
 *
 * - 공정: 이름 · 시작일 · 종료일 · 진행률(0~100). 전체 진행률은 공정 일수로 가중 평균한다.
 * - 일일 보고: 업체·날짜마다 한 건. 오늘 한 일 · 내일 계획 · 특이사항 · 고객용 정리글(summary).
 *   공개(published)한 보고만 협력업체 포털에 보인다.
 * - 사진: 보고에 붙고, 설명(caption)과 관련 공정을 달 수 있다. 브라우저에서 줄여 한 장씩 올린다(quote_photos 와 같은 방식).
 */
let ready: Promise<void> | null = null

export const MAX_REPORT_PHOTO_BYTES = 2 * 1024 * 1024
export const MAX_PHOTOS_PER_REPORT = 40

export function ensureProgress(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS project_tasks (
        id          bigint generated always as identity primary key,
        client_id   bigint not null references clients(id) on delete cascade,
        name        text not null,
        crew        text not null default '',
        start_date  date not null,
        end_date    date not null,
        progress    int not null default 0 check (progress between 0 and 100),
        sort        int not null default 0,
        memo        text not null default '',
        done_at     timestamptz,
        updated_at  timestamptz not null default now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS project_tasks_client_idx ON project_tasks (client_id, sort, start_date)`)
      await pool.query(`CREATE TABLE IF NOT EXISTS daily_reports (
        id           bigint generated always as identity primary key,
        client_id    bigint not null references clients(id) on delete cascade,
        report_date  date not null,
        weather      text not null default '',
        crew         text not null default '',
        work_done    text not null default '',
        plan_next    text not null default '',
        issues       text not null default '',
        summary      text not null default '',
        task_updates jsonb not null default '[]',
        published    boolean not null default false,
        published_at timestamptz,
        notified_at  timestamptz,
        created_by   text,
        created_at   timestamptz not null default now(),
        updated_at   timestamptz not null default now(),
        unique (client_id, report_date)
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS report_photos (
        id         bigint generated always as identity primary key,
        report_id  bigint not null references daily_reports(id) on delete cascade,
        task_id    bigint references project_tasks(id) on delete set null,
        caption    text not null default '',
        mime       text not null,
        bytes      int not null,
        data       bytea not null,
        sort       int not null default 0,
        created_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS report_photos_report_idx ON report_photos (report_id, sort, id)`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

// ---------- 날짜 ----------

/** 한국 시간 오늘 (YYYY-MM-DD) */
export function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

const DAY = 86_400_000
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`)
export const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(toMs(d))

/** 시작~종료 일수 (양 끝 포함) */
export function spanDays(start: string, end: string): number {
  return Math.max(1, Math.round((toMs(end) - toMs(start)) / DAY) + 1)
}

// ---------- 공정 ----------

export type Task = {
  id: number
  name: string
  crew: string
  start: string
  end: string
  progress: number
  sort: number
  memo: string
}

type TaskRow = { id: string; name: string; crew: string; start: string; end: string; progress: number; sort: number; memo: string }
const toTask = (r: TaskRow): Task => ({ ...r, id: Number(r.id) })

export async function listTasks(clientId: number): Promise<Task[]> {
  await ensureProgress()
  const { rows } = await pool.query<TaskRow>(
    `SELECT id, name, crew, to_char(start_date,'YYYY-MM-DD') AS start, to_char(end_date,'YYYY-MM-DD') AS end,
            progress, sort, memo
       FROM project_tasks WHERE client_id = $1 ORDER BY sort, start_date, id`,
    [clientId],
  )
  return rows.map(toTask)
}

export type TaskInput = { name: string; crew?: string; start: string; end: string; progress?: number; memo?: string }

function cleanTask(t: TaskInput) {
  const name = String(t.name ?? '').trim().slice(0, 100)
  if (!name) throw new Error('공정 이름을 넣어 주세요.')
  if (!isDate(t.start) || !isDate(t.end)) throw new Error('날짜를 확인해 주세요.')
  const [start, end] = t.start <= t.end ? [t.start, t.end] : [t.end, t.start]
  const progress = Math.max(0, Math.min(100, Math.round(Number(t.progress ?? 0)) || 0))
  return { name, crew: String(t.crew ?? '').trim().slice(0, 200), start, end, progress, memo: String(t.memo ?? '').trim().slice(0, 1000) }
}

export async function upsertTask(clientId: number, id: number | null, input: TaskInput): Promise<void> {
  await ensureProgress()
  const t = cleanTask(input)
  if (id) {
    await pool.query(
      `UPDATE project_tasks SET name=$3, crew=$4, start_date=$5, end_date=$6, progress=$7, memo=$8,
              done_at = CASE WHEN $7 = 100 THEN coalesce(done_at, now()) ELSE NULL END, updated_at=now()
        WHERE id=$1 AND client_id=$2`,
      [id, clientId, t.name, t.crew, t.start, t.end, t.progress, t.memo],
    )
  } else {
    await pool.query(
      `INSERT INTO project_tasks (client_id, name, crew, start_date, end_date, progress, memo, sort, done_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, coalesce((SELECT max(sort)+1 FROM project_tasks WHERE client_id=$1),0),
               CASE WHEN $6 = 100 THEN now() END)`,
      [clientId, t.name, t.crew, t.start, t.end, t.progress, t.memo],
    )
  }
}

export async function deleteTask(clientId: number, id: number): Promise<void> {
  await ensureProgress()
  await pool.query(`DELETE FROM project_tasks WHERE id=$1 AND client_id=$2`, [id, clientId])
}

export async function moveTask(clientId: number, id: number, dir: -1 | 1): Promise<void> {
  const tasks = await listTasks(clientId)
  const i = tasks.findIndex((t) => t.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= tasks.length) return
  ;[tasks[i], tasks[j]] = [tasks[j], tasks[i]]
  await Promise.all(tasks.map((t, n) => pool.query(`UPDATE project_tasks SET sort=$2 WHERE id=$1`, [t.id, n])))
}

export async function setTaskProgress(clientId: number, id: number, progress: number): Promise<void> {
  await ensureProgress()
  const p = Math.max(0, Math.min(100, Math.round(progress) || 0))
  await pool.query(
    `UPDATE project_tasks SET progress=$3, done_at = CASE WHEN $3 = 100 THEN coalesce(done_at, now()) ELSE NULL END, updated_at=now()
      WHERE id=$1 AND client_id=$2`,
    [id, clientId, p],
  )
}

export async function insertTasks(clientId: number, tasks: TaskInput[]): Promise<void> {
  for (const t of tasks) await upsertTask(clientId, null, t)
}

/** 전체 진행률(실제)과 오늘 기준 계획 진행률. 둘 다 공정 일수로 가중 평균 */
export function overall(tasks: Task[], today = todayKst()) {
  if (!tasks.length) return null
  let total = 0
  let done = 0
  let planned = 0
  for (const t of tasks) {
    const days = spanDays(t.start, t.end)
    total += days
    done += (days * t.progress) / 100
    if (today >= t.end) planned += days
    else if (today >= t.start) planned += spanDays(t.start, today)
  }
  const start = tasks.reduce((a, t) => (t.start < a ? t.start : a), tasks[0].start)
  const end = tasks.reduce((a, t) => (t.end > a ? t.end : a), tasks[0].end)
  return {
    actual: Math.round((done / total) * 100),
    planned: Math.round((planned / total) * 100),
    start,
    end,
    completed: tasks.filter((t) => t.progress >= 100).length,
    count: tasks.length,
    /** 오늘 예정된 공정 */
    today: tasks.filter((t) => t.start <= today && today <= t.end),
  }
}

// ---------- 일일 보고 ----------

export type TaskUpdate = { taskId: number; name: string; progress: number }

export type Report = {
  id: number
  date: string
  weather: string
  crew: string
  workDone: string
  planNext: string
  issues: string
  summary: string
  taskUpdates: TaskUpdate[]
  published: boolean
  publishedAt: string | null
  notifiedAt: string | null
  updatedAt: string
  photos: Photo[]
}

export type Photo = { id: number; caption: string; taskId: number | null; bytes: number }

type ReportRow = {
  id: string
  date: string
  weather: string
  crew: string
  work_done: string
  plan_next: string
  issues: string
  summary: string
  task_updates: TaskUpdate[]
  published: boolean
  published_at: Date | null
  notified_at: Date | null
  updated_at: Date
}

async function photosFor(reportIds: number[]): Promise<Map<number, Photo[]>> {
  const out = new Map<number, Photo[]>()
  if (!reportIds.length) return out
  const { rows } = await pool.query<{ id: string; report_id: string; caption: string; task_id: string | null; bytes: number }>(
    `SELECT id, report_id, caption, task_id, bytes FROM report_photos WHERE report_id = ANY($1::bigint[]) ORDER BY sort, id`,
    [reportIds],
  )
  for (const r of rows) {
    const k = Number(r.report_id)
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push({ id: Number(r.id), caption: r.caption, taskId: r.task_id ? Number(r.task_id) : null, bytes: r.bytes })
  }
  return out
}

/** 업체의 일일 보고. publishedOnly 면 공개한 것만 (포털용). 최근 날짜부터 */
export async function listReports(clientId: number, { publishedOnly = false } = {}): Promise<Report[]> {
  await ensureProgress()
  const { rows } = await pool.query<ReportRow>(
    `SELECT id, to_char(report_date,'YYYY-MM-DD') AS date, weather, crew, work_done, plan_next, issues, summary,
            task_updates, published, published_at, notified_at, updated_at
       FROM daily_reports WHERE client_id = $1 ${publishedOnly ? 'AND published' : ''}
      ORDER BY report_date DESC LIMIT 200`,
    [clientId],
  )
  const photos = await photosFor(rows.map((r) => Number(r.id)))
  return rows.map((r) => ({
    id: Number(r.id),
    date: r.date,
    weather: r.weather,
    crew: r.crew,
    workDone: r.work_done,
    planNext: r.plan_next,
    issues: r.issues,
    summary: r.summary,
    taskUpdates: Array.isArray(r.task_updates) ? r.task_updates : [],
    published: r.published,
    publishedAt: r.published_at?.toISOString() ?? null,
    notifiedAt: r.notified_at?.toISOString() ?? null,
    updatedAt: r.updated_at.toISOString(),
    photos: photos.get(Number(r.id)) ?? [],
  }))
}

/** 그 날짜 보고를 열거나(없으면 빈 초안을 만든다) 그 id 를 돌려준다 */
export async function openReport(clientId: number, date: string, by: string): Promise<number> {
  await ensureProgress()
  if (!isDate(date)) throw new Error('날짜를 확인해 주세요.')
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO daily_reports (client_id, report_date, created_by) VALUES ($1,$2,$3)
     ON CONFLICT (client_id, report_date) DO UPDATE SET report_date = EXCLUDED.report_date
     RETURNING id`,
    [clientId, date, by],
  )
  return Number(rows[0].id)
}

export type ReportInput = {
  weather: string
  crew: string
  workDone: string
  planNext: string
  issues: string
  summary: string
  taskUpdates: { taskId: number; progress: number }[]
}

/** 보고 저장. 보고에 적은 공정 진행률은 공정표에도 반영한다 */
export async function saveReport(clientId: number, reportId: number, input: ReportInput): Promise<void> {
  await ensureProgress()
  const t = (v: unknown, max = 4000) => String(v ?? '').trim().slice(0, max)
  const tasks = await listTasks(clientId)
  const byId = new Map(tasks.map((x) => [x.id, x]))
  const updates: TaskUpdate[] = []
  for (const u of input.taskUpdates ?? []) {
    const task = byId.get(Number(u.taskId))
    if (!task) continue
    const progress = Math.max(0, Math.min(100, Math.round(Number(u.progress)) || 0))
    updates.push({ taskId: task.id, name: task.name, progress })
  }
  const res = await pool.query(
    `UPDATE daily_reports SET weather=$3, crew=$4, work_done=$5, plan_next=$6, issues=$7, summary=$8, task_updates=$9, updated_at=now()
      WHERE id=$1 AND client_id=$2`,
    [reportId, clientId, t(input.weather, 50), t(input.crew, 300), t(input.workDone), t(input.planNext), t(input.issues), t(input.summary, 8000), JSON.stringify(updates)],
  )
  if (!res.rowCount) throw new Error('보고를 찾지 못했습니다.')
  for (const u of updates) if (byId.get(u.taskId)!.progress !== u.progress) await setTaskProgress(clientId, u.taskId, u.progress)
}

/** 공개 상태 바꾸기. 처음 공개하는 보고면 true 를 돌려준다 (알림 메일 보낼지 판단) */
export async function setPublished(clientId: number, reportId: number, published: boolean): Promise<boolean> {
  await ensureProgress()
  const { rows } = await pool.query<{ first: boolean }>(
    `UPDATE daily_reports SET published=$3, published_at = CASE WHEN $3 THEN coalesce(published_at, now()) ELSE published_at END, updated_at=now()
      WHERE id=$1 AND client_id=$2
      RETURNING ($3 AND notified_at IS NULL) AS first`,
    [reportId, clientId, published],
  )
  return Boolean(rows[0]?.first)
}

export async function markNotified(reportId: number): Promise<void> {
  await pool.query(`UPDATE daily_reports SET notified_at = now() WHERE id=$1`, [reportId])
}

export async function deleteReport(clientId: number, reportId: number): Promise<void> {
  await ensureProgress()
  await pool.query(`DELETE FROM daily_reports WHERE id=$1 AND client_id=$2`, [reportId, clientId])
}

export async function getReportDate(clientId: number, reportId: number): Promise<string | null> {
  const { rows } = await pool.query<{ d: string }>(`SELECT to_char(report_date,'YYYY-MM-DD') AS d FROM daily_reports WHERE id=$1 AND client_id=$2`, [reportId, clientId])
  return rows[0]?.d ?? null
}

// ---------- 사진 ----------

export async function addPhoto(clientId: number, reportId: number, p: { mime: string; data: Buffer; caption: string; taskId: number | null }): Promise<number> {
  await ensureProgress()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO report_photos (report_id, task_id, caption, mime, bytes, data, sort)
     SELECT r.id, (SELECT t.id FROM project_tasks t WHERE t.id = $3 AND t.client_id = r.client_id), $4, $5, $6, $7,
            coalesce((SELECT max(sort)+1 FROM report_photos WHERE report_id = r.id), 0)
       FROM daily_reports r
      WHERE r.id = $1 AND r.client_id = $2
        AND (SELECT count(*) FROM report_photos WHERE report_id = r.id) < $8
     RETURNING id`,
    [reportId, clientId, p.taskId, p.caption.trim().slice(0, 500), p.mime, p.data.length, p.data, MAX_PHOTOS_PER_REPORT],
  )
  if (!rows[0]) throw new Error(`보고를 찾지 못했거나 사진이 ${MAX_PHOTOS_PER_REPORT}장을 넘었습니다.`)
  return Number(rows[0].id)
}

export async function updatePhoto(clientId: number, photoId: number, caption: string, taskId: number | null): Promise<void> {
  await ensureProgress()
  await pool.query(
    `UPDATE report_photos p SET caption = $3,
            task_id = (SELECT t.id FROM project_tasks t WHERE t.id = $4 AND t.client_id = $2)
       FROM daily_reports r WHERE p.id = $1 AND p.report_id = r.id AND r.client_id = $2`,
    [photoId, clientId, caption.trim().slice(0, 500), taskId],
  )
}

export async function deletePhoto(clientId: number, photoId: number): Promise<void> {
  await ensureProgress()
  await pool.query(`DELETE FROM report_photos p USING daily_reports r WHERE p.id = $1 AND p.report_id = r.id AND r.client_id = $2`, [photoId, clientId])
}

/** 사진 한 장. clientId 를 주면 그 업체의 공개된 보고 사진만 (포털용) */
export async function readPhoto(photoId: number, portalClientId?: number): Promise<{ mime: string; data: Buffer } | null> {
  await ensureProgress()
  const { rows } = await pool.query<{ mime: string; data: Buffer }>(
    portalClientId === undefined
      ? `SELECT mime, data FROM report_photos WHERE id = $1`
      : `SELECT p.mime, p.data FROM report_photos p JOIN daily_reports r ON r.id = p.report_id
          WHERE p.id = $1 AND r.client_id = $2 AND r.published`,
    portalClientId === undefined ? [photoId] : [photoId, portalClientId],
  )
  return rows[0] ?? null
}
