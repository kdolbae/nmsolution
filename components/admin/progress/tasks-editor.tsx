'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, CalendarRange, Download, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Gantt } from '@/components/progress/gantt'
import { deleteTaskAction, importKktTasksAction, moveTaskAction, saveTaskAction } from '@/app/actions/progress'
import type { Task } from '@/lib/portal/progress'

type Draft = { id: number | null; name: string; crew: string; start: string; end: string; progress: number; memo: string }

/** 공정표 편집: 공정 추가·수정·순서·삭제, 진행률. 위에 간트로 미리 본다 */
export function TasksEditor({ clientId, tasks, today, canImportKkt }: { clientId: number; tasks: Task[]; today: string; canImportKkt: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setError('')
    start(async () => {
      const r = await fn()
      if (!r.ok) setError(r.error ?? '저장하지 못했습니다.')
      else {
        after?.()
        router.refresh()
      }
    })
  }

  const blank = (): Draft => {
    const last = tasks.at(-1)
    const s = last?.end ?? today
    return { id: null, name: '', crew: '', start: s, end: s, progress: 0, memo: '' }
  }

  return (
    <section className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarRange className="size-4" strokeWidth={1.75} /> 공정표
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">공정별 일정과 진행률. 협력업체 포털 &apos;공정 현황&apos;에 그대로 보입니다.</p>
        </div>
        <div className="flex gap-2">
          {canImportKkt && tasks.length === 0 && (
            <Button variant="outline" className="rounded-none" disabled={pending} onClick={() => run(() => importKktTasksAction(clientId))}>
              <Download /> 제안서 일정 불러오기
            </Button>
          )}
          <Button className="rounded-none" disabled={pending} onClick={() => setDraft(blank())}>
            <Plus /> 공정 추가
          </Button>
        </div>
      </div>

      {tasks.length > 0 ? <Gantt tasks={tasks} today={today} /> : <p className="text-sm text-muted-foreground">아직 공정이 없습니다.</p>}

      {draft && (
        <form
          className="grid gap-3 border border-electric/40 bg-electric/5 p-4 sm:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => saveTaskAction(clientId, draft.id, draft), () => setDraft(null))
          }}
        >
          <label className="flex flex-col gap-1 text-xs sm:col-span-3">
            공정 이름
            <Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="예: 접합부 용접" className="h-10 rounded-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-3">
            투입 인원·장비
            <Input value={draft.crew} onChange={(e) => setDraft({ ...draft, crew: e.target.value })} placeholder="예: 용접사 3명, CO2 용접기 3대" className="h-10 rounded-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            시작일
            <Input type="date" required value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value, end: draft.end < e.target.value ? e.target.value : draft.end })} className="h-10 rounded-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            종료일
            <Input type="date" required min={draft.start} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="h-10 rounded-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            진행률 {draft.progress}%
            <input type="range" min={0} max={100} step={5} value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} className="h-10 accent-electric" />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-6">
            메모 (내부용)
            <Input value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} className="h-10 rounded-none" />
          </label>
          <div className="flex gap-2 sm:col-span-6">
            <Button type="submit" className="rounded-none" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} 저장
            </Button>
            <Button type="button" variant="outline" className="rounded-none" onClick={() => setDraft(null)}>
              <X /> 취소
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tasks.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {tasks.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.start}
                  {t.end !== t.start && ` ~ ${t.end}`} · {t.progress}%{t.crew && ` · ${t.crew}`}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" aria-label="위로" disabled={pending || i === 0} onClick={() => run(() => moveTaskAction(clientId, t.id, -1))}>
                  <ArrowUp />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="아래로" disabled={pending || i === tasks.length - 1} onClick={() => run(() => moveTaskAction(clientId, t.id, 1))}>
                  <ArrowDown />
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" disabled={pending} onClick={() => setDraft({ ...t })}>
                  <Pencil /> 수정
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none text-destructive"
                  disabled={pending}
                  onClick={() => confirm(`'${t.name}' 공정을 지울까요?`) && run(() => deleteTaskAction(clientId, t.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
