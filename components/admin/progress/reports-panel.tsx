'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Eye, EyeOff, ImagePlus, Loader2, NotebookPen, Save, Send, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ReportCard, dateLabel } from '@/components/progress/report-card'
import {
  aiDraftAction,
  deletePhotoAction,
  deleteReportAction,
  openReportAction,
  publishReportAction,
  saveReportAction,
  updatePhotoAction,
} from '@/app/actions/progress'
import type { Report, Task } from '@/lib/portal/progress'

const LONG_EDGE = 1600
const QUALITY = 0.78
const PHOTO_BASE = '/api/admin/progress/photos'

/** 휴대폰 사진을 긴 변 1600px JPEG 로 줄인다 (한 장 수백 KB). 못 여는 형식이면 작은 JPG·PNG 만 그대로 */
async function shrink(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, LONG_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (blob) return blob
    throw new Error('toBlob')
  } catch {
    if (/^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 1_800_000) return file
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * 일일 보고: 날짜를 골라 보고를 열고(없으면 새로), 현장에서 사진을 바로 찍어 올리고 설명을 단다.
 * 'AI 정리'는 메모와 사진으로 고객용 보고문·사진 설명 초안을 만든다. 공개하면 협력업체 포털에 보인다.
 */
export function ReportsPanel({
  clientId,
  tasks,
  reports,
  today,
  ai,
  mail,
  members,
}: {
  clientId: number
  tasks: Task[]
  reports: Report[]
  today: string
  ai: boolean
  mail: boolean
  members: number
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [date, setDate] = useState(today)
  const [openId, setOpenId] = useState<number | null>(() => reports.find((r) => r.date === today)?.id ?? null)
  const [error, setError] = useState('')
  const open = reports.find((r) => r.id === openId) ?? null

  const openDate = (d: string) => {
    const found = reports.find((r) => r.date === d)
    if (found) return setOpenId(found.id)
    setError('')
    start(async () => {
      const r = await openReportAction(clientId, d)
      if (!r.ok) return setError(r.error)
      setOpenId(r.data)
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <NotebookPen className="size-4" strokeWidth={1.75} /> 일일 현장 보고
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            현장에서 사진을 찍어 올리고 한 일을 적습니다. 공개한 보고만 협력업체 포털에 보입니다
            {mail ? ` (공개하면 승인된 관계자 ${members}명에게 메일 알림)` : ''}.
          </p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="h-9 w-40 rounded-none" />
          <Button className="h-9 rounded-none" disabled={pending || !date} onClick={() => openDate(date)}>
            {pending ? <Loader2 className="animate-spin" /> : <NotebookPen />} {reports.some((r) => r.date === date) ? '보고 열기' : '보고 쓰기'}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {reports.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {reports.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpenId(r.id)}
              className={cn(
                'flex shrink-0 flex-col items-start border px-3 py-2 text-left text-xs',
                r.id === openId ? 'border-electric bg-electric/5' : 'border-border hover:bg-muted/50',
              )}
            >
              <span className="font-semibold">{dateLabel(r.date)}</span>
              <span className={r.published ? 'text-emerald-700' : 'text-muted-foreground'}>
                {r.published ? '공개' : '작성 중'} · 사진 {r.photos.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && <ReportEditor key={open.id} clientId={clientId} report={open} tasks={tasks} ai={ai} onClose={() => setOpenId(null)} />}
    </section>
  )
}

type PhotoEdit = { caption: string; taskId: number | null }

function ReportEditor({ clientId, report, tasks, ai, onClose }: { clientId: number; report: Report; tasks: Task[]; ai: boolean; onClose: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    weather: report.weather,
    crew: report.crew,
    workDone: report.workDone,
    planNext: report.planNext,
    issues: report.issues,
    summary: report.summary,
  })
  // 그날 예정된 공정 + 이 보고에 이미 적힌 공정
  const dayTasks = useMemo(
    () => tasks.filter((t) => (t.start <= report.date && report.date <= t.end) || report.taskUpdates.some((u) => u.taskId === t.id)),
    [tasks, report],
  )
  const [progress, setProgress] = useState<Record<number, number>>(() =>
    Object.fromEntries(dayTasks.map((t) => [t.id, report.taskUpdates.find((u) => u.taskId === t.id)?.progress ?? t.progress])),
  )
  const [extraTask, setExtraTask] = useState('')
  const [edits, setEdits] = useState<Record<number, PhotoEdit>>({})
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)

  // 다른 탭에서 사진이 늘어나도 편집 중인 설명은 유지
  useEffect(() => {
    setEdits((cur) => Object.fromEntries(Object.entries(cur).filter(([id]) => report.photos.some((p) => p.id === Number(id)))))
  }, [report.photos])

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDirty(true)
  }
  const photo = (id: number): PhotoEdit => {
    const p = report.photos.find((x) => x.id === id)!
    return edits[id] ?? { caption: p.caption, taskId: p.taskId }
  }
  const shownTasks = tasks.filter((t) => t.id in progress)

  const save = async (): Promise<boolean> => {
    const r = await saveReportAction(clientId, report.id, {
      ...form,
      taskUpdates: Object.entries(progress).map(([taskId, p]) => ({ taskId: Number(taskId), progress: p })),
    })
    if (!r.ok) {
      setMsg({ text: r.error, error: true })
      return false
    }
    for (const [id, e] of Object.entries(edits)) {
      const p = report.photos.find((x) => x.id === Number(id))
      if (p && (p.caption !== e.caption || p.taskId !== e.taskId)) await updatePhotoAction(clientId, Number(id), e.caption, e.taskId)
    }
    setDirty(false)
    return true
  }

  const onSave = () =>
    start(async () => {
      if (await save()) {
        setMsg({ text: '저장했습니다.' })
        router.refresh()
      }
    })

  const onPublish = (on: boolean) =>
    start(async () => {
      if (dirty && !(await save())) return
      const r = await publishReportAction(clientId, report.id, on)
      if (!r.ok) return setMsg({ text: r.error, error: true })
      setMsg({ text: on ? (r.data.mailed ? `공개했습니다. 관계자 ${r.data.mailed}명에게 메일을 보냈습니다.` : '공개했습니다. 포털에서 볼 수 있습니다.') : '비공개로 돌렸습니다.' })
      router.refresh()
    })

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
    const defaultTask = dayTasks.length === 1 ? dayTasks[0].id : null
    setUploading({ done: 0, total: list.length })
    setMsg(null)
    let failed = 0
    for (const [i, file] of list.entries()) {
      try {
        const blob = await shrink(file)
        if (!blob) throw new Error('형식')
        const fd = new FormData()
        fd.set('clientId', String(clientId))
        fd.set('reportId', String(report.id))
        fd.set('photo', blob, 'photo.jpg')
        if (defaultTask) fd.set('taskId', String(defaultTask))
        const res = await fetch('/api/admin/progress/photos', { method: 'POST', body: fd })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '업로드 실패')
      } catch (e) {
        failed++
        console.error(e)
      }
      setUploading({ done: i + 1, total: list.length })
    }
    setUploading(null)
    if (failed) setMsg({ text: `사진 ${failed}장을 올리지 못했습니다 (JPG·PNG, 한 보고에 40장까지).`, error: true })
    router.refresh()
  }

  const runAi = async () => {
    setAiBusy(true)
    setMsg(null)
    try {
      const r = await aiDraftAction(
        clientId,
        report.id,
        { weather: form.weather, crew: form.crew, workDone: form.workDone, planNext: form.planNext, issues: form.issues },
        report.photos.map((p) => ({ id: p.id, ...photo(p.id) })),
      )
      if (!r.ok) return setMsg({ text: r.error, error: true })
      setForm((f) => ({ ...f, summary: r.data.summary, workDone: r.data.workDone, planNext: r.data.planNext, issues: r.data.issues }))
      setEdits((cur) => {
        const next = { ...cur }
        for (const c of r.data.captions) {
          const p = report.photos.find((x) => x.id === c.photoId)
          if (p) next[c.photoId] = { caption: c.caption, taskId: (cur[c.photoId] ?? p).taskId }
        }
        return next
      })
      setDirty(true)
      setMsg({ text: 'AI 초안을 채웠습니다. 내용을 확인하고 고친 뒤 저장하세요.' })
    } finally {
      setAiBusy(false)
    }
  }

  const busy = pending || aiBusy || Boolean(uploading)
  const taskNames = Object.fromEntries(tasks.map((t) => [t.id, t.name]))

  return (
    <div className="flex flex-col gap-5 border-t border-border pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex-1 text-base font-bold">
          {dateLabel(report.date)} 보고
          <span className={cn('ml-2 px-1.5 py-0.5 align-middle text-[10px] font-semibold', report.published ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground')}>
            {report.published ? '공개 중' : '작성 중 (업체에 안 보임)'}
          </span>
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)}>
          <Eye /> {preview ? '편집으로' : '고객 화면 미리보기'}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="닫기" onClick={onClose}>
          <X />
        </Button>
      </div>

      {preview ? (
        <ReportCard
          report={{
            ...report,
            ...form,
            taskUpdates: shownTasks.map((t) => ({ taskId: t.id, name: t.name, progress: progress[t.id] })),
            photos: report.photos.map((p) => ({ ...p, ...photo(p.id) })),
          }}
          photoBase={PHOTO_BASE}
          taskNames={taskNames}
        />
      ) : (
        <>
          {/* 사진 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">현장 사진 {report.photos.length}장</span>
              <Button className="h-11 rounded-none px-4 text-base" disabled={busy} onClick={() => cameraRef.current?.click()}>
                <Camera /> 사진 찍기
              </Button>
              <Button variant="outline" className="h-11 rounded-none px-4 text-base" disabled={busy} onClick={() => albumRef.current?.click()}>
                <ImagePlus /> 앨범에서
              </Button>
              {uploading && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> 올리는 중 {uploading.done}/{uploading.total}
                </span>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
              <input ref={albumRef} type="file" accept="image/*" multiple hidden onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
            </div>
            {report.photos.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.photos.map((p) => {
                  const e = photo(p.id)
                  return (
                    <li key={p.id} className="flex flex-col gap-2 border border-border p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${PHOTO_BASE}/${p.id}`} alt="" className="aspect-[4/3] w-full bg-muted object-cover" />
                      <Textarea
                        rows={2}
                        value={e.caption}
                        placeholder="사진 설명 (예: 접합부 1층 용접 완료, 비드 상태 양호)"
                        onChange={(ev) => (setEdits((c) => ({ ...c, [p.id]: { ...e, caption: ev.target.value } })), setDirty(true))}
                        className="min-h-14 rounded-none text-sm"
                      />
                      <div className="flex gap-2">
                        <select
                          value={e.taskId ?? ''}
                          onChange={(ev) => (setEdits((c) => ({ ...c, [p.id]: { ...e, taskId: Number(ev.target.value) || null } })), setDirty(true))}
                          className="h-8 min-w-0 flex-1 border border-input bg-background px-2 text-xs"
                        >
                          <option value="">공정 선택 안 함</option>
                          {tasks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="rounded-none text-destructive"
                          aria-label="사진 삭제"
                          disabled={busy}
                          onClick={() => confirm('이 사진을 지울까요?') && start(async () => (await deletePhotoAction(clientId, p.id), router.refresh()))}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* 공정 진행 */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">오늘 공정 진행률</span>
            {shownTasks.length === 0 && <p className="text-xs text-muted-foreground">이 날짜에 예정된 공정이 없습니다. 아래에서 공정을 골라 넣을 수 있습니다.</p>}
            {shownTasks.map((t) => (
              <label key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border border-border p-3 sm:grid-cols-[minmax(0,240px)_1fr_auto]">
                <span className="text-sm font-medium">
                  {t.name}
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {t.start} ~ {t.end}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress[t.id]}
                  onChange={(e) => (setProgress((p) => ({ ...p, [t.id]: Number(e.target.value) })), setDirty(true))}
                  className="col-span-2 h-8 accent-electric sm:col-span-1"
                />
                <span className={cn('row-start-1 w-14 text-right font-mono text-sm font-bold sm:row-start-auto', progress[t.id] >= 100 && 'text-emerald-700')}>
                  {progress[t.id] >= 100 ? '완료' : `${progress[t.id]}%`}
                </span>
              </label>
            ))}
            {tasks.some((t) => !(t.id in progress)) && (
              <div className="flex gap-2">
                <select value={extraTask} onChange={(e) => setExtraTask(e.target.value)} className="h-9 min-w-0 flex-1 border border-input bg-background px-2 text-sm">
                  <option value="">다른 공정 추가…</option>
                  {tasks
                    .filter((t) => !(t.id in progress))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.progress}%)
                      </option>
                    ))}
                </select>
                <Button
                  variant="outline"
                  className="h-9 rounded-none"
                  disabled={!extraTask}
                  onClick={() => {
                    const t = tasks.find((x) => x.id === Number(extraTask))
                    if (t) setProgress((p) => ({ ...p, [t.id]: t.progress }))
                    setExtraTask('')
                    setDirty(true)
                  }}
                >
                  넣기
                </Button>
              </div>
            )}
          </div>

          {/* 메모 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              날씨
              <Input value={form.weather} onChange={(e) => set('weather', e.target.value)} placeholder="예: 맑음 14℃" className="h-10 rounded-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              투입 인원·장비
              <Input value={form.crew} onChange={(e) => set('crew', e.target.value)} placeholder="예: 용접사 3, 화재감시 1 · CO2 용접기 3대" className="h-10 rounded-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              오늘 한 일
              <Textarea rows={5} value={form.workDone} onChange={(e) => set('workDone', e.target.value)} placeholder="현장 메모를 편하게 적으세요. AI 정리로 다듬을 수 있습니다." className="rounded-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              다음 계획
              <Textarea rows={5} value={form.planNext} onChange={(e) => set('planNext', e.target.value)} className="rounded-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs sm:col-span-2">
              특이사항 · 협의 필요
              <Textarea rows={2} value={form.issues} onChange={(e) => set('issues', e.target.value)} placeholder="지연, 발주처 확인이 필요한 일 등" className="rounded-none" />
            </label>
          </div>

          <div className="flex flex-col gap-2 border border-electric/30 bg-electric/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">고객에게 보이는 오늘의 요약</span>
              {ai ? (
                <Button variant="outline" className="rounded-none" disabled={busy} onClick={runAi}>
                  {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} {aiBusy ? 'AI 가 정리하는 중…' : 'AI 정리'}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">AI 정리는 ANTHROPIC_API_KEY 를 넣으면 켜집니다</span>
              )}
            </div>
            <Textarea rows={5} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="오늘 작업을 3~6줄로 요약합니다. 비워 두면 '오늘 한 일'만 보입니다." className="rounded-none bg-background" />
          </div>
        </>
      )}

      {msg && <p className={cn('text-sm', msg.error ? 'text-destructive' : 'text-emerald-700')}>{msg.text}</p>}

      <div className="sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <Button className="h-10 rounded-none" disabled={busy} onClick={onSave}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} 저장{dirty ? ' *' : ''}
        </Button>
        {report.published ? (
          <Button variant="outline" className="h-10 rounded-none" disabled={busy} onClick={() => onPublish(false)}>
            <EyeOff /> 비공개로
          </Button>
        ) : (
          <Button variant="outline" className="h-10 rounded-none border-emerald-600 text-emerald-700" disabled={busy} onClick={() => onPublish(true)}>
            <Send /> 저장하고 업체에 공개
          </Button>
        )}
        <span className="flex-1" />
        <Button
          variant="ghost"
          className="h-10 rounded-none text-destructive"
          disabled={busy}
          onClick={() =>
            confirm(`${dateLabel(report.date)} 보고와 사진을 모두 지울까요?`) &&
            start(async () => {
              await deleteReportAction(clientId, report.id)
              onClose()
              router.refresh()
            })
          }
        >
          <Trash2 /> 보고 삭제
        </Button>
      </div>
    </div>
  )
}
