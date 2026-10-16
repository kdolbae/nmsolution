'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { addVisit, deletePhoto, deleteVisit, saveAnswer, uploadPhoto } from '@/app/actions/est'
import { Btn, ErrorLine, FieldRow, inputCls, selectCls, textareaCls } from './ui'
import { useAct } from './use-act'
import { cn } from '@/lib/utils'

type Question = { id: number; code: string; label: string; answerType: string; options: { value: string; label: string }[]; unit: string | null; required: boolean }
type Answer = { questionId: number; value: unknown; confirmNeeded: boolean; note: string | null }
type Photo = { id: number; questionId: number | null; caption: string }
type Visit = { id: number; userName: string; visitedOn: string; purpose: string; hours: number | null; note: string | null }

const PURPOSE: Record<string, string> = { survey: '현장 조사', meeting: '협의', supervise: '공사 관리', handover: '인수인계', other: '기타' }
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const answered = (v: unknown) => !(v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0))

/** S4 현장 확인(모바일 우선, 390px 한 열). 질문별 즉시 저장 */
export function SiteCheck({
  projectId,
  questions,
  answers,
  photos,
  visits,
  requiredPhotos,
  today,
}: {
  projectId: number
  questions: Question[]
  answers: Answer[]
  photos: Photo[]
  visits: Visit[]
  requiredPhotos: number
  today: string
}) {
  const [state, setState] = useState<Record<number, Answer>>(() => Object.fromEntries(answers.map((a) => [a.questionId, a])))
  const qs = questions.filter((q) => q.answerType !== 'photo')
  const required = qs.filter((q) => q.required)
  const doneReq = required.filter((q) => answered(state[q.id]?.value) || state[q.id]?.confirmNeeded).length

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pb-24">
      {qs.map((q) => (
        <QuestionCard
          key={q.id}
          projectId={projectId}
          q={q}
          a={state[q.id]}
          photos={photos.filter((p) => p.questionId === q.id)}
          onChange={(a) => setState((s) => ({ ...s, [q.id]: a }))}
        />
      ))}

      <PhotoBox projectId={projectId} photos={photos.filter((p) => !p.questionId)} title="현장 사진(전체)" />
      <Visits projectId={projectId} visits={visits} today={today} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 py-3 lg:left-60">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 text-sm">
          <span>
            필수 질문 <b className="font-mono">{doneReq}/{required.length}</b> · 사진 <b className="font-mono">{photos.length}/{requiredPhotos}</b>
          </span>
          <span className="text-xs text-muted-foreground">답은 고를 때마다 저장됨</span>
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ projectId, q, a, photos, onChange }: { projectId: number; q: Question; a?: Answer; photos: Photo[]; onChange: (a: Answer) => void }) {
  const [save, setSave] = useState<SaveState>('idle')
  const [err, setErr] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cur: Answer = a ?? { questionId: q.id, value: null, confirmNeeded: false, note: null }
  const [text, setText] = useState(cur.value === null || cur.value === undefined ? '' : String(cur.value))
  const pendingRef = useRef<Answer | null>(null)

  const persist = async (next: Answer) => {
    pendingRef.current = next
    setSave('saving')
    const r = await saveAnswer(projectId, q.id, next.value, next.confirmNeeded, next.note ?? undefined).catch(() => ({ ok: false as const, error: '저장 못함' }))
    if (pendingRef.current !== next) return
    if (r.ok) {
      setSave('saved')
      setErr(null)
    } else {
      setSave('error')
      setErr(r.error)
    }
  }
  const commit = (next: Answer, debounce = 0) => {
    onChange(next)
    if (timer.current) clearTimeout(timer.current)
    if (debounce) timer.current = setTimeout(() => persist(next), debounce)
    else persist(next)
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const setValue = (value: unknown, debounce = 0) => commit({ ...cur, value }, debounce)
  const isDone = answered(cur.value) || cur.confirmNeeded

  return (
    <section className={cn('flex flex-col gap-3 bg-background p-4 ring-1', isDone ? 'ring-border' : q.required ? 'ring-electric/50' : 'ring-border')}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">
          {q.label}
          {q.required && <span className="ml-1 text-electric">*</span>}
        </h3>
        <span className="flex h-6 shrink-0 items-center text-xs text-muted-foreground">
          {save === 'saving' && <Loader2 className="size-4 animate-spin" />}
          {save === 'saved' && <Check className="size-4 text-[color:var(--sb-ok)]" />}
        </span>
      </div>

      {q.answerType === 'bool' && (
        <div className="grid grid-cols-2 gap-2">
          {[
            [true, '예'],
            [false, '아니오'],
          ].map(([val, label]) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setValue(cur.value === val ? null : val)}
              className={cn('h-12 border text-base font-medium', cur.value === val ? 'border-navy bg-navy text-navy-foreground' : 'border-border bg-background')}
            >
              {label as string}
            </button>
          ))}
        </div>
      )}
      {q.answerType === 'number' && (
        <div className="flex items-center gap-2">
          <input
            className={inputCls + ' h-12 text-base'}
            inputMode="decimal"
            value={text}
            onChange={(e) => {
              const t = e.target.value.replace(/[^\d.]/g, '')
              setText(t)
              setValue(t === '' ? null : Number(t), 700)
            }}
          />
          {q.unit && <span className="shrink-0 text-sm text-muted-foreground">{q.unit}</span>}
        </div>
      )}
      {q.answerType === 'select' && (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setValue(cur.value === o.value ? null : o.value)}
              className={cn('min-h-12 border px-2 text-sm font-medium', cur.value === o.value ? 'border-navy bg-navy text-navy-foreground' : 'border-border bg-background')}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {q.answerType === 'multi' && (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o) => {
            const list = Array.isArray(cur.value) ? (cur.value as string[]) : []
            const on = list.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setValue(on ? list.filter((x) => x !== o.value) : [...list, o.value])}
                className={cn('min-h-12 border px-2 text-sm font-medium', on ? 'border-navy bg-navy text-navy-foreground' : 'border-border bg-background')}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
      {q.answerType === 'text' && (
        <textarea
          className={textareaCls + ' text-base'}
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setValue(e.target.value || null, 900)
          }}
        />
      )}

      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" className="size-5" checked={cur.confirmNeeded} onChange={(e) => commit({ ...cur, confirmNeeded: e.target.checked })} />
        확인 못함(고객 서류에 &ldquo;협의 후 확정&rdquo;으로 표기)
      </label>

      {photos.length > 0 && <Thumbs photos={photos} />}
      <PhotoButton projectId={projectId} questionId={q.id} />

      {save === 'error' && (
        <div className="flex items-center justify-between gap-2 border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <span>{err ?? '저장 못함'}</span>
          <button type="button" className="inline-flex items-center gap-1 font-medium underline" onClick={() => persist(cur)}>
            <RotateCcw className="size-3.5" /> 다시 저장
          </button>
        </div>
      )}
    </section>
  )
}

/** 긴 변 2000px JPEG 로 줄이기(서버 액션 본문 한도). 브라우저가 못 읽는 형식(HEIC 등)은 그대로 */
async function shrink(file: File): Promise<File> {
  if (file.size < 900 * 1024) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

function PhotoButton({ projectId, questionId }: { projectId: number; questionId?: number }) {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setErr(null)
    for (const f of Array.from(files)) {
      const fd = new FormData()
      fd.set('projectId', String(projectId))
      if (questionId) fd.set('questionId', String(questionId))
      fd.set('file', await shrink(f))
      const r = await uploadPhoto(fd).catch(() => ({ ok: false as const, error: '올리지 못함' }))
      if (!r.ok) {
        setErr(r.error)
        break
      }
    }
    setBusy(false)
    if (ref.current) ref.current.value = ''
    router.refresh()
  }
  return (
    <div className="flex flex-col gap-1">
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <Btn className="h-11" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        사진 찍기·올리기
      </Btn>
      <ErrorLine error={err} />
    </div>
  )
}

function Thumbs({ photos }: { photos: Photo[] }) {
  const { pending, run } = useAct()
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <div key={p.id} className="relative aspect-square bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/admin/est/photo/${p.id}`} alt={p.caption || '현장 사진'} className="size-full object-cover" loading="lazy" />
          <button
            type="button"
            aria-label="사진 지우기"
            disabled={pending}
            onClick={() => confirm('이 사진을 지울까요?') && run(() => deletePhoto(p.id))}
            className="absolute right-1 top-1 inline-flex size-7 items-center justify-center bg-background/90 text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function PhotoBox({ projectId, photos, title }: { projectId: number; photos: Photo[]; title: string }) {
  return (
    <section className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border">
      <h3 className="text-base font-semibold">{title}</h3>
      {photos.length > 0 && <Thumbs photos={photos} />}
      <PhotoButton projectId={projectId} />
    </section>
  )
}

function Visits({ projectId, visits, today }: { projectId: number; visits: Visit[]; today: string }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState({ visitedOn: today, purpose: 'survey', hours: '', note: '' })
  return (
    <section className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border">
      <h3 className="text-base font-semibold">방문 기록</h3>
      <p className="text-xs text-muted-foreground">담당자 실제 일수(정산)는 이 기록 합계가 기본값임</p>
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="날짜">
          <input type="date" className={inputCls} value={v.visitedOn} onChange={(e) => setV({ ...v, visitedOn: e.target.value })} />
        </FieldRow>
        <FieldRow label="목적">
          <select className={selectCls} value={v.purpose} onChange={(e) => setV({ ...v, purpose: e.target.value })}>
            {Object.entries(PURPOSE).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="시간(h)">
          <input className={inputCls} inputMode="decimal" value={v.hours} onChange={(e) => setV({ ...v, hours: e.target.value.replace(/[^\d.]/g, '') })} />
        </FieldRow>
        <FieldRow label="메모">
          <input className={inputCls} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
        </FieldRow>
      </div>
      <Btn
        variant="primary"
        className="h-11"
        disabled={pending}
        onClick={() => run(() => addVisit(projectId, { visitedOn: v.visitedOn, purpose: v.purpose, hours: v.hours ? Number(v.hours) : null, note: v.note }), () => setV({ ...v, hours: '', note: '' }))}
      >
        방문 추가
      </Btn>
      <ErrorLine error={error} />
      <ul className="flex flex-col">
        {visits.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
            <span>
              <span className="font-mono">{x.visitedOn}</span> · {PURPOSE[x.purpose] ?? x.purpose} · {x.userName}
              {x.hours ? ` · ${x.hours}h` : ''}
              {x.note ? <span className="block text-xs text-muted-foreground">{x.note}</span> : null}
            </span>
            <button type="button" aria-label="방문 기록 지우기" className="text-muted-foreground hover:text-destructive" onClick={() => confirm('이 방문 기록을 지울까요?') && run(() => deleteVisit(x.id))}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
