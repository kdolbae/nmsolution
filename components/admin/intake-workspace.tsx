'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Check, FileText, Loader2, RotateCcw, Send, Sparkles, Trash2, Upload, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/admin/form'
import { MicButton } from '@/components/admin/mic-button'
import { applyIntakeDraft, deleteIntake, deleteIntakeFile, resetIntakeAi, saveIntakeCaption, saveIntakeText } from '@/app/actions/intake'
import { calcQuote, won } from '@/lib/clients/quote'
import { intakeFileUrl } from '@/lib/intake/proposal'
import type { IntakeAnalysis, IntakeDraft, IntakeMessage } from '@/lib/intake/table'

export type FileView = { id: number; name: string; mime: string; bytes: number; caption: string; key: string }
export type IntakeView = {
  id: number
  title: string
  description: string
  clientId: number | null
  analysis: IntakeAnalysis | null
  messages: IntakeMessage[]
  draft: IntakeDraft | null
}

/** 사진은 긴 변 1600px JPEG 로 줄여 올린다 (한 장 수백 KB, 함수 본문 한도 4MB 안쪽) */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const img = await createImageBitmap(file)
    const k = Math.min(1, 1600 / Math.max(img.width, img.height))
    if (k === 1 && file.size < 1.2 * 1024 * 1024) return file
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k)
    c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise((ok) => c.toBlob((b) => ok(b ?? file), 'image/jpeg', 0.85))
  } catch {
    return file
  }
}

const isImage = (m: string) => m.startsWith('image/')

/**
 * AI 견적 접수 작업 화면.
 * 1) 자료(사진 여러 장·PDF·텍스트)와 설명(글·음성) → 2) 분석: 공사 유형·방향·질문 → 3) 답변(글·음성) 주고받기
 * → 4) 제안서·견적서 초안 → 5) 업체에 넣기(기존 업체 덮어쓰기 또는 새 업체 등록).
 */
export function IntakeWorkspace({ intake: initial, files: initialFiles, clients }: { intake: IntakeView; files: FileView[]; clients: { id: number; name: string }[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [desc, setDesc] = useState(initial.description)
  const [textDirty, setTextDirty] = useState(false)
  const [files, setFiles] = useState(initialFiles)
  const [analysis, setAnalysis] = useState(initial.analysis)
  const [messages, setMessages] = useState(initial.messages)
  const [draft, setDraft] = useState(initial.draft)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState<'' | 'analyze' | 'answer' | 'draft'>('')
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const chatEnd = useRef<HTMLDivElement>(null)

  // 글은 멈춘 뒤 1초에 자동 저장
  useEffect(() => {
    if (!textDirty) return
    const t = setTimeout(() => {
      saveIntakeText(initial.id, title, desc).then(() => setTextDirty(false)).catch(() => setError('설명을 저장하지 못했습니다.'))
    }, 1000)
    return () => clearTimeout(t)
  }, [title, desc, textDirty, initial.id])
  const saveNow = async () => {
    if (textDirty) {
      await saveIntakeText(initial.id, title, desc)
      setTextDirty(false)
    }
  }

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, busy])

  const upload = useCallback(
    async (list: FileList | File[]) => {
      const arr = Array.from(list)
      if (!arr.length) return
      setError('')
      setUploading({ done: 0, total: arr.length })
      const fails: string[] = []
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i]
        try {
          const blob = await shrink(f)
          const fd = new FormData()
          fd.append('file', blob, blob === f ? f.name : f.name.replace(/\.[^.]+$/, '') + '.jpg')
          const res = await fetch(`/api/admin/intake/${initial.id}/files`, { method: 'POST', body: fd })
          const data = (await res.json()) as { file?: FileView; error?: string }
          if (!res.ok || !data.file) fails.push(data.error ?? f.name)
          else setFiles((cur) => [...cur, data.file!])
        } catch {
          fails.push(f.name)
        }
        setUploading({ done: i + 1, total: arr.length })
      }
      setUploading(null)
      if (fails.length) setError(`올리지 못한 파일: ${fails.join(', ')}`)
    },
    [initial.id],
  )

  const ai = async (action: 'analyze' | 'answer' | 'draft', text?: string) => {
    setError('')
    setBusy(action)
    try {
      await saveNow()
      const res = await fetch(`/api/admin/intake/${initial.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text }),
      })
      const data = (await res.json()) as { analysis?: IntakeAnalysis; messages?: IntakeMessage[]; draft?: IntakeDraft; error?: string }
      if (!res.ok) return setError(data.error ?? '실패했습니다.')
      if (data.analysis) setAnalysis(data.analysis)
      if (data.messages) setMessages(data.messages)
      if (data.draft) setDraft(data.draft)
      if (action === 'answer') setAnswer('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '실패했습니다.')
    } finally {
      setBusy('')
    }
  }

  const removeFile = (id: number) =>
    startTransition(async () => {
      await deleteIntakeFile(id)
      setFiles((cur) => cur.filter((f) => f.id !== id))
    })

  const reset = () => {
    if (!confirm('분석·대화·초안을 지우고 자료만 남길까요?')) return
    startTransition(async () => {
      await resetIntakeAi(initial.id)
      setAnalysis(null)
      setMessages([])
      setDraft(null)
    })
  }

  const images = files.filter((f) => isImage(f.mime))
  const docs = files.filter((f) => !isImage(f.mime))

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</p>}

      {/* 1. 자료·설명 */}
      <section className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">1. 자료와 설명</h2>
          <span className="text-xs text-muted-foreground">{textDirty ? '저장 중…' : '자동 저장됨'}</span>
          <Button variant="ghost" size="sm" className="ml-auto rounded-none text-muted-foreground" onClick={() => confirm('이 접수를 지울까요? 자료도 같이 지워집니다.') && deleteIntake(initial.id)}>
            <Trash2 /> 접수 삭제
          </Button>
        </div>
        <Field
          label="공사명 (가제)"
          value={title}
          onChange={(v) => {
            setTitle(v)
            setTextDirty(true)
          }}
          placeholder="예: ○○공장 냉각수 배관 교체"
        />
        <div className="flex flex-col gap-2">
          <Field
            label="설명 (현장 상황, 고객 요청, 조건)"
            multiline
            rows={6}
            value={desc}
            onChange={(v) => {
              setDesc(v)
              setTextDirty(true)
            }}
            placeholder="고객이 뭘 원하는지, 현장이 어떤지, 사진에 뭐가 찍혔는지 아는 대로 적음. 마이크로 말해도 됨."
          />
          <MicButton
            onText={(t) => {
              setDesc((d) => (d ? `${d.trimEnd()} ${t}` : t))
              setTextDirty(true)
            }}
          />
        </div>

        <div
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void upload(e.dataTransfer.files)
          }}
        >
          <Upload className="size-5" />
          <p>사진·PDF·텍스트를 여기에 끌어다 놓거나</p>
          <Button variant="outline" size="sm" className="rounded-none" onClick={() => fileRef.current?.click()} disabled={!!uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />} {uploading ? `올리는 중 ${uploading.done}/${uploading.total}` : '파일 고르기 (여러 장 가능)'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void upload(e.target.files)
              e.target.value = ''
            }}
          />
          <p className="text-xs">사진은 자동으로 줄여서 올림 (한 장 1600px). PDF 는 4MB 까지.</p>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((f, i) => (
              <figure key={f.id} className="flex flex-col border border-border bg-background">
                <a href={intakeFileUrl(f)} target="_blank" rel="noreferrer" className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={intakeFileUrl(f)} alt={f.caption || f.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  <span className="absolute left-1 top-1 bg-black/60 px-1.5 text-[11px] text-white">사진 {i + 1}</span>
                </a>
                <div className="flex items-center gap-1 p-1">
                  <input
                    defaultValue={f.caption}
                    placeholder="사진 설명 (선택)"
                    className="h-7 min-w-0 flex-1 border border-input bg-background px-1.5 text-xs"
                    onBlur={(e) => {
                      const v = e.target.value
                      if (v !== f.caption) {
                        setFiles((cur) => cur.map((x) => (x.id === f.id ? { ...x, caption: v } : x)))
                        void saveIntakeCaption(f.id, v)
                      }
                    }}
                  />
                  <Button variant="ghost" size="icon-xs" title="삭제" onClick={() => confirm('이 사진을 지울까요?') && removeFile(f.id)}>
                    <X />
                  </Button>
                </div>
              </figure>
            ))}
          </div>
        )}
        {docs.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {docs.map((f) => (
              <li key={f.id} className="flex items-center gap-1 border border-border px-2 py-1">
                <FileText className="size-4 text-muted-foreground" />
                <a href={intakeFileUrl(f)} target="_blank" rel="noreferrer" className="hover:underline">
                  {f.name}
                </a>
                <span className="text-xs text-muted-foreground">{Math.round(f.bytes / 1024)}KB</span>
                <Button variant="ghost" size="icon-xs" title="삭제" onClick={() => confirm('이 파일을 지울까요?') && removeFile(f.id)}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. 분석·질문 */}
      <section className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">2. 공사 유형·방향과 질문</h2>
          {!analysis ? (
            <Button className="rounded-none" onClick={() => ai('analyze')} disabled={!!busy || !desc.trim()}>
              {busy === 'analyze' ? <Loader2 className="animate-spin" /> : <Sparkles />} 자료 분석하고 질문 받기
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" className="rounded-none" onClick={() => ai('analyze')} disabled={!!busy} title="자료·설명을 바꿨으면 다시 분석">
                {busy === 'analyze' ? <Loader2 className="animate-spin" /> : <RotateCcw />} 다시 분석
              </Button>
              <Button variant="ghost" size="sm" className="rounded-none text-muted-foreground" onClick={reset} disabled={!!busy || pending}>
                처음부터
              </Button>
            </>
          )}
          {!desc.trim() && !analysis && <span className="text-xs text-muted-foreground">설명을 한 줄이라도 적어야 분석함</span>}
        </div>

        {analysis && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">공사 유형</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {analysis.types.map((t) => (
                    <li key={t.code}>
                      <span className="border border-electric/40 bg-electric/5 px-1.5 py-0.5 font-mono text-xs">{t.code}</span> <b>{t.name}</b>
                      <span className="text-muted-foreground"> · {t.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">현황 요약</p>
                <p className="mt-1 whitespace-pre-wrap">{analysis.summary}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">공사 방향</p>
                <p className="mt-1 whitespace-pre-wrap">{analysis.direction}</p>
              </div>
              {analysis.facts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">확정된 사실</p>
                  <ul className="mt-1 list-inside list-disc">
                    {analysis.facts.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto bg-secondary p-3 text-sm">
                {messages.map((m, i) => (
                  <div key={i} className={`max-w-[92%] whitespace-pre-wrap px-3 py-2 ${m.role === 'assistant' ? 'self-start bg-background ring-1 ring-border' : 'self-end bg-electric text-white'}`}>
                    {m.text}
                  </div>
                ))}
                {busy === 'answer' && (
                  <div className="flex items-center gap-2 self-start text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> 답을 반영하는 중
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              {analysis.questions.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  남은 질문 {analysis.questions.length}개
                  <ul className="mt-1 list-inside list-decimal text-foreground">
                    {analysis.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-1 text-xs text-electric">
                  <Check className="size-3" /> 더 물을 게 없음. 초안을 만들 수 있음
                </p>
              )}
              <textarea
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="질문에 답함. 여러 질문을 한 번에 답해도 됨. 모르면 '모름'이라고 적으면 추정으로 진행함."
                className="border border-input bg-background p-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && answer.trim()) ai('answer', answer)
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button className="rounded-none" onClick={() => ai('answer', answer)} disabled={!!busy || !answer.trim()}>
                  {busy === 'answer' ? <Loader2 className="animate-spin" /> : <Send />} 답 보내기
                </Button>
                <MicButton onText={(t) => setAnswer((a) => (a ? `${a.trimEnd()} ${t}` : t))} />
                <span className="text-xs text-muted-foreground">Ctrl+Enter 로 보냄</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. 초안 */}
      <section className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">3. 제안서·견적서 초안</h2>
          <Button className="rounded-none" variant={analysis?.ready ? 'default' : 'outline'} onClick={() => ai('draft')} disabled={!!busy || !analysis}>
            {busy === 'draft' ? <Loader2 className="animate-spin" /> : <Wand2 />} {draft ? '초안 다시 만들기' : '초안 만들기'}
          </Button>
          {!analysis && <span className="text-xs text-muted-foreground">먼저 분석을 함</span>}
          {analysis && !analysis.ready && !draft && <span className="text-xs text-muted-foreground">질문이 남았지만 지금 만들 수도 있음 (모르는 값은 추정)</span>}
          {busy === 'draft' && <span className="text-xs text-muted-foreground">1~3분 걸림</span>}
        </div>
        {draft && <DraftView draft={draft} files={files} intakeId={initial.id} clients={clients} appliedClientId={initial.clientId} onApplied={(id) => router.push(`/admin/clients/${id}?tab=quote`)} />}
      </section>
    </div>
  )
}

function DraftView({
  draft,
  files,
  intakeId,
  clients,
  appliedClientId,
  onApplied,
}: {
  draft: IntakeDraft
  files: FileView[]
  intakeId: number
  clients: { id: number; name: string }[]
  appliedClientId: number | null
  onApplied: (clientId: number) => void
}) {
  const calc = useMemo(() => calcQuote(draft.quote), [draft.quote])
  const p = draft.proposal
  const [mode, setMode] = useState<'existing' | 'new'>(clients.length ? 'existing' : 'new')
  const [clientId, setClientId] = useState(String(appliedClientId ?? clients[0]?.id ?? ''))
  const [nc, setNc] = useState({ name: '', contactPerson: '', phone: '', siteAddress: '' })
  const [msg, setMsg] = useState('')
  const [pending, startTransition] = useTransition()
  const photos = p.photoIds.map((id) => files.find((f) => f.id === id)).filter((f): f is FileView => !!f)

  const apply = () => {
    setMsg('')
    const target = mode === 'existing' ? { clientId: Number(clientId) } : { newClient: { ...nc, bizNumber: '', email: '', memo: '', portalSlug: '', portalLogin: '' } }
    if (mode === 'existing' && !confirm(`'${clients.find((c) => c.id === Number(clientId))?.name}' 업체의 제안서·견적서를 이 초안으로 바꿀까요? (이전 내용은 버전 기록에 남음)`)) return
    startTransition(async () => {
      try {
        const res = await applyIntakeDraft(intakeId, target)
        onApplied(res.clientId)
      } catch (e) {
        setMsg(e instanceof Error ? e.message : '넣지 못했습니다.')
      }
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-3 text-sm">
        <h3 className="font-semibold">제안서 내용</h3>
        <p>
          <b>{p.title}</b>
          <br />
          <span className="text-muted-foreground">{p.oneLine}</span>
        </p>
        <Block label="현황" text={p.current} />
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-1">
            {photos.map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={intakeFileUrl(f)} alt={f.caption || f.name} className="aspect-[4/3] w-full object-cover" />
            ))}
          </div>
        )}
        <Block label="제안 방향" text={p.direction} />
        <div>
          <p className="text-xs font-medium text-muted-foreground">작업 범위</p>
          <ul className="list-inside list-disc">{p.scope.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">작업 순서</p>
          <ol className="list-inside list-decimal">
            {p.steps.map((s, i) => (
              <li key={i}>
                <b>{s.title}</b> {s.text}
              </li>
            ))}
          </ol>
        </div>
        <Block label="공사 기간" text={p.period} />
        {p.excluded.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">제외</p>
            <ul className="list-inside list-disc">{p.excluded.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 text-sm">
        <h3 className="font-semibold">
          견적서 <span className="font-normal text-muted-foreground">· {draft.quote.title}</span>
        </h3>
        <p className="tabular-nums">
          공급가액 <b>{won(calc.supply)}</b> · 부가세 {won(calc.vat)} · 합계 <b className="text-electric">{won(calc.grand)}원</b>
          {calc.options > 0 && <> · 선택 항목 별도 {won(calc.options)}</>}
        </p>
        {draft.quote.sections.map((s, si) => (
          <div key={s.id} className="border border-border">
            <div className="flex items-center gap-2 bg-secondary px-3 py-1.5">
              <b>{s.name}</b>
              {s.option && <span className="text-xs text-muted-foreground">선택 항목</span>}
              <span className="ml-auto tabular-nums">{won(calc.sections[si].total)}원</span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {s.items.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="w-14 px-2 py-1 text-muted-foreground">{i.kind}</td>
                    <td className="px-2 py-1">
                      {i.name}
                      {i.spec && <span className="text-muted-foreground"> · {i.spec}</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
                      {i.qty} {i.unit} × {won(i.price)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{won(i.qty * i.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{draft.quote.notes}</p>
        {draft.checks.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 p-3 text-xs dark:bg-amber-950/20">
            <p className="font-medium">저장 전 확인할 것</p>
            <ul className="list-inside list-disc">{draft.checks.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        )}

        <div className="flex flex-col gap-3 bg-secondary p-4">
          <p className="font-semibold">업체에 넣기</p>
          <p className="text-xs text-muted-foreground">넣은 뒤 업체 화면의 제안서·견적서 탭에서 줄·단가를 고치고 저장함. 고객에게 보이려면 거기서 '고객 발송본으로 확정'.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} disabled={!clients.length} /> 기존 업체
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} /> 새 업체 등록
            </label>
          </div>
          {mode === 'existing' ? (
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9 border border-input bg-background px-2 text-sm">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="업체명" value={nc.name} onChange={(v) => setNc({ ...nc, name: v })} />
              <Field label="담당자" value={nc.contactPerson} onChange={(v) => setNc({ ...nc, contactPerson: v })} />
              <Field label="연락처" value={nc.phone} onChange={(v) => setNc({ ...nc, phone: v })} />
              <Field label="현장 주소" value={nc.siteAddress} onChange={(v) => setNc({ ...nc, siteAddress: v })} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button className="rounded-none" onClick={apply} disabled={pending || (mode === 'existing' ? !clientId : !nc.name.trim())}>
              {pending ? <Loader2 className="animate-spin" /> : <Building2 />} 제안서·견적서로 넣기
            </Button>
            {appliedClientId && (
              <Link href={`/admin/clients/${appliedClientId}?tab=quote`} className="text-xs text-electric hover:underline">
                전에 넣은 업체 열기
              </Link>
            )}
            {msg && <span className="text-xs text-destructive">{msg}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  )
}
