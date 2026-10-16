'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { getClient } from '@/lib/clients/table'
import { mailLayout, sendMail } from '@/lib/mail'
import { siteUrl } from '@/lib/site'
import { pool } from '@/lib/db'
import { aiDraft, type AiDraft } from '@/lib/portal/ai'
import {
  deletePhoto,
  deleteReport,
  deleteTask,
  getReportDate,
  insertTasks,
  listReports,
  listTasks,
  markNotified,
  moveTask,
  openReport,
  saveReport,
  setPublished,
  updatePhoto,
  upsertTask,
  type ReportInput,
  type TaskInput,
} from '@/lib/portal/progress'
import { KKT_CLIENT } from '@/lib/clients/seed-kkt'

const refresh = (clientId: number) => {
  revalidatePath(`/admin/clients/${clientId}/progress`)
  revalidatePath('/portal')
}

async function guard<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  await requireAdmin()
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    console.error('[progress]', e)
    return { ok: false, error: e instanceof Error ? e.message : '저장하지 못했습니다.' }
  }
}

// ---------- 공정표 ----------

export async function saveTaskAction(clientId: number, id: number | null, input: TaskInput) {
  const r = await guard(() => upsertTask(clientId, id, input))
  refresh(clientId)
  return r
}

export async function deleteTaskAction(clientId: number, id: number) {
  const r = await guard(() => deleteTask(clientId, id))
  refresh(clientId)
  return r
}

export async function moveTaskAction(clientId: number, id: number, dir: -1 | 1) {
  const r = await guard(() => moveTask(clientId, id, dir))
  refresh(clientId)
  return r
}

/** 금강변압기 제안서의 가정 일정(2026.10.21 착공, 11일)을 공정표로 넣는다. 공정이 하나도 없을 때만 */
export async function importKktTasksAction(clientId: number) {
  const r = await guard(async () => {
    const client = await getClient(clientId)
    if (client?.name !== KKT_CLIENT.name) throw new Error('금강변압기 업체에서만 쓸 수 있습니다.')
    if ((await listTasks(clientId)).length) throw new Error('이미 공정이 있습니다.')
    await insertTasks(clientId, KKT_TASKS)
  })
  refresh(clientId)
  return r
}

const KKT_TASKS: TaskInput[] = [
  { name: '안전펜스 설치·작업구역 통제', crew: '조공 2명', start: '2026-10-21', end: '2026-10-21' },
  { name: '베이스 제작·설치', crew: '시공자 3명 · 용접기, 절단기, 현장 30t 갠트리', start: '2026-10-21', end: '2026-10-23' },
  { name: '회전·베이스 안착 (100t + 60t)', crew: '도비 6명, 신호수 2명, 안전담당 1명 · 100t + 60t 크레인', start: '2026-10-24', end: '2026-10-24' },
  { name: '접합면 사상', crew: '사상 기술자 2명, 조공 2명, 화재감시 1명 · 그라인더, 환기·조명', start: '2026-10-26', end: '2026-10-27' },
  { name: '용접면 밀착 이동', crew: '도비 6명·3명, 안전담당 1명 · 유압잭·윈치 25tf 이상', start: '2026-10-28', end: '2026-10-29' },
  { name: '접합부 용접', crew: '용접사 3명, 고급기술자 2명, 화재감시 1명 · CO2 용접기 3대', start: '2026-10-30', end: '2026-11-02' },
  { name: '펜스 해체·정리', crew: '조공 2명', start: '2026-11-02', end: '2026-11-02' },
]

// ---------- 일일 보고 ----------

/** 그 날짜 보고를 열거나 새로 만든다 */
export async function openReportAction(clientId: number, date: string) {
  const admin = await requireAdmin()
  const r = await guard(() => openReport(clientId, date, admin.name || admin.email))
  refresh(clientId)
  return r
}

export async function saveReportAction(clientId: number, reportId: number, input: ReportInput) {
  const r = await guard(() => saveReport(clientId, reportId, input))
  refresh(clientId)
  return r
}

export async function deleteReportAction(clientId: number, reportId: number) {
  const r = await guard(() => deleteReport(clientId, reportId))
  refresh(clientId)
  return r
}

/** 공개하면 업체 관계자가 포털에서 본다. 처음 공개할 때 승인된 관계자에게 메일(메일이 켜져 있을 때) */
export async function publishReportAction(clientId: number, reportId: number, published: boolean) {
  const r = await guard(async () => {
    const first = await setPublished(clientId, reportId, published)
    if (!first) return { mailed: 0 }
    const [client, date, members] = await Promise.all([
      getClient(clientId),
      getReportDate(clientId, reportId),
      pool.query<{ email: string }>(
        `SELECT u.email FROM client_members m JOIN "user" u ON u.id = m.user_id WHERE m.client_id = $1 AND m.status = 'approved'`,
        [clientId],
      ),
    ])
    const to = members.rows.map((m) => m.email).filter(Boolean)
    if (!to.length || !client) return { mailed: 0 }
    const sent = await sendMail({
      to,
      subject: `[엔엠솔루션] ${client.name} ${date} 공사 진행 보고`,
      html: mailLayout({
        title: `${date} 공사 진행 보고`,
        lines: [`${client.name} 현장의 오늘 작업 내용과 사진을 올렸습니다.`, '협력업체 포털에서 공정 현황과 함께 확인하실 수 있습니다.'],
        button: { label: '진행 현황 보기', url: `${siteUrl()}/portal` },
      }),
    })
    if (sent) await markNotified(reportId)
    return { mailed: sent ? to.length : 0 }
  })
  refresh(clientId)
  return r
}

// ---------- 사진 ----------

export async function updatePhotoAction(clientId: number, photoId: number, caption: string, taskId: number | null) {
  const r = await guard(() => updatePhoto(clientId, photoId, caption, taskId))
  refresh(clientId)
  return r
}

export async function deletePhotoAction(clientId: number, photoId: number) {
  const r = await guard(() => deletePhoto(clientId, photoId))
  refresh(clientId)
  return r
}

// ---------- AI 정리 ----------

/**
 * 지금 적은 메모(저장 전 내용 포함)와 사진으로 고객용 보고 초안을 만든다. 저장은 하지 않는다:
 * 화면에서 초안을 보고 고친 뒤 저장한다.
 */
export async function aiDraftAction(
  clientId: number,
  reportId: number,
  memo: Pick<ReportInput, 'weather' | 'crew' | 'workDone' | 'planNext' | 'issues'>,
  photos: { id: number; caption: string; taskId: number | null }[],
): Promise<{ ok: true; data: AiDraft } | { ok: false; error: string }> {
  return guard(async () => {
    const [client, tasks, reports] = await Promise.all([getClient(clientId), listTasks(clientId), listReports(clientId)])
    const report = reports.find((x) => x.id === reportId)
    if (!client || !report) throw new Error('보고를 찾지 못했습니다.')
    const own = new Set(report.photos.map((p) => p.id))
    const taskName = new Map(tasks.map((t) => [t.id, t.name]))
    return aiDraft({
      clientName: client.name,
      date: report.date,
      ...memo,
      tasks: tasks.map((t) => ({ ...t, today: t.start <= report.date && report.date <= t.end })),
      photos: photos.filter((p) => own.has(p.id)).map((p) => ({ id: p.id, caption: p.caption, task: (p.taskId && taskName.get(p.taskId)) || '' })),
    })
  })
}
