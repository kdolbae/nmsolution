import { newId, type Quote } from './quote'

/** 상세 공정 형식 (어드민 화면·서버 공용, DB 를 쓰지 않음). 저장은 lib/clients/schedule.ts */

export const STEP_STATUSES = ['planned', 'doing', 'done', 'hold'] as const
export type StepStatus = (typeof STEP_STATUSES)[number]
export const STEP_STATUS_LABEL: Record<StepStatus, string> = { planned: '예정', doing: '진행 중', done: '완료', hold: '보류' }

export type ScheduleStep = {
  id: string
  /** 공정 이름 (예: 기존 지붕 철거) */
  name: string
  /** YYYY-MM-DD. 날짜가 정해지지 않았으면 빈 문자열 */
  start: string
  end: string
  /** 투입 인원·장비 (예: 기능공 2, 조공 2, 스카이잭 1) */
  crew: string
  status: StepStatus
  /** 0~100 */
  progress: number
  note: string
}

export type Schedule = {
  steps: ScheduleStep[]
  /** 고친 횟수. 처음 저장하면 1 */
  revision: number
  updatedAt: string | null
  updatedBy: string
  source: string
}

export type ScheduleLog = { revision: number; at: string; by: string; source: string; summary: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeSteps(raw: unknown): ScheduleStep[] {
  if (!Array.isArray(raw)) throw new Error('공정은 목록으로 보내야 함.')
  if (raw.length > 200) throw new Error('공정은 200개까지 넣을 수 있음.')
  const t = (v: unknown, n = 300) => String(v ?? '').trim().slice(0, n)
  return raw.map((x: Record<string, unknown>) => {
    const name = t(x?.name, 200)
    if (!name) throw new Error('공정 이름이 비어 있음.')
    const start = t(x?.start, 10)
    const end = t(x?.end, 10)
    if (start && !DATE.test(start)) throw new Error(`'${name}' 시작일은 YYYY-MM-DD 로 넣어야 함.`)
    if (end && !DATE.test(end)) throw new Error(`'${name}' 종료일은 YYYY-MM-DD 로 넣어야 함.`)
    const status = (STEP_STATUSES as readonly string[]).includes(String(x?.status)) ? (x.status as StepStatus) : 'planned'
    const progress = Math.max(0, Math.min(100, Math.round(Number(x?.progress) || 0)))
    return {
      id: t(x?.id, 40) || newId('st'),
      name,
      start,
      end,
      crew: t(x?.crew),
      status,
      progress: status === 'done' ? 100 : progress,
      note: t(x?.note, 2000),
    }
  })
}

/** 견적 공종으로 공정 초안을 만든다 (선택 항목 공종은 뺀다) */
export function stepsFromQuote(q: Quote): ScheduleStep[] {
  return q.sections
    .filter((s) => !s.option && s.name.trim())
    .map((s) => ({ id: newId('st'), name: s.name.trim(), start: '', end: '', crew: '', status: 'planned' as const, progress: 0, note: s.desc.trim() }))
}
