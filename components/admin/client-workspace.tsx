'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bold,
  Check,
  Code,
  Copy,
  Download,
  Expand,
  FileText,
  Calculator,
  ImagePlus,
  Loader2,
  Lock,
  MonitorPlay,
  Pencil,
  Plus,
  Printer,
  FileDown,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { Field } from '@/components/admin/form'
import { NumInput, TextIn } from '@/components/admin/inputs'
import { TakeoffPanel } from '@/components/admin/takeoff-panel'
import type { TakeoffTemplate } from '@/lib/clients/takeoff'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deleteClient, resetProposal, saveClientInfo, saveProposal, saveQuote } from '@/app/actions/clients'
import {
  ITEM_KINDS,
  calcQuote,
  discountForGrand,
  emptyItem,
  modeFields,
  sectionMode,
  itemAmount,
  newId,
  quoteDocument,
  won,
  type ItemKind,
  type Quote,
  type SectionCalcMode,
  type QuoteItem,
  type QuoteSection,
} from '@/lib/clients/quote'
import { withBrandFont } from '@/lib/clients/proposal'
import { PresentOverlay, type PresentDoc } from '@/components/admin/present'
import { LockBanner, VersionHistory, VersionView, type Finalized, type VersionRow } from '@/components/admin/client-versions'

type ClientInfo = {
  id: number
  name: string
  bizNumber: string
  contactPerson: string
  phone: string
  email: string
  siteAddress: string
  memo: string
  portalSlug: string
  portalLogin: string
  portalPasswordSet: boolean
}

type Tab = 'proposal' | 'quote'
type PrintDocs = 'both' | 'book' | 'proposal' | 'quote'

export function ClientWorkspace({
  client: initialClient,
  proposalHtml,
  quote: initialQuote,
  initialTab,
  files = [],
  videos = [],
  takeoffTemplates = [],
  versions,
  finalized,
  view,
}: {
  client: ClientInfo
  proposalHtml: string
  quote: Quote
  initialTab: Tab
  /** 인쇄용 제출 서류(lib/clients/files.ts) */
  files?: { file: string; label: string }[]
  /** 현장 영상(lib/clients/media.ts, R2) */
  videos?: { url: string; label: string }[]
  /** 적산 템플릿 (기본 + 저장한 것) */
  takeoffTemplates?: TakeoffTemplate[]
  /** 버전 기록 (최신이 먼저) */
  versions: VersionRow[]
  /** 최종본 확정. 확정되면 제안서·견적서를 고칠 수 없다 */
  finalized: Finalized
  /** ?v=N 으로 고른 지난 버전. 있으면 편집 화면 대신 읽기 전용으로 보여 준다 */
  view: { no: number; at: string; summary: string; proposalHtml: string; quote: Quote } | null
}) {
  const [client, setClient] = useState(initialClient)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [proposalDirty, setProposalDirty] = useState(false)
  const [quoteDirty, setQuoteDirty] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [present, setPresent] = useState<Tab | null>(null)
  // 프레젠테이션에 띄울 지금 화면의 제안서·견적서 (견적서는 저장 전 수정도 포함)
  const live = useRef({ proposal: proposalHtml, quote: '' })

  const locked = !!finalized
  const latest = versions[0]?.no ?? 0

  const switchTab = (t: Tab) => {
    setTab(t)
    window.history.replaceState(null, '', view ? `?v=${view.no}&tab=${t}` : `?tab=${t}`)
  }

  return (
    <div className="flex flex-col gap-5">
      <ClientHeader client={client} onSaved={setClient} />

      {finalized && <LockBanner finalized={finalized} />}

      {files.length > 0 && (
        <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
          <div>
            <h2 className="text-sm font-semibold">제출 서류 (인쇄본)</h2>
            <p className="text-xs text-muted-foreground">발주처에 낸 양식 그대로의 PDF·엑셀입니다. 누르면 바로 내려받습니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((f) => (
              <a
                key={f.file}
                href={`/api/admin/clients/${client.id}/files/${f.file}`}
                download
                className={cn(buttonVariants({ variant: 'outline' }), 'rounded-none')}
              >
                <Download /> {f.label}
              </a>
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
          <div>
            <h2 className="text-sm font-semibold">현장 영상</h2>
            <p className="text-xs text-muted-foreground">드론 촬영 원본에서 필요한 구간만 잘라 올린 영상입니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {videos.map((v) => (
              <figure key={v.url} className="flex flex-col gap-2">
                <video src={v.url} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
                <figcaption className="text-sm">{v.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <VersionHistory clientId={client.id} versions={versions} finalized={finalized} viewing={view?.no ?? null} />

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <div className="flex gap-1" role="tablist" aria-label="문서">
          {(
            [
              ['proposal', '제안서', FileText],
              ['quote', '견적서', Calculator],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => switchTab(value)}
              className={cn(
                '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                tab === value ? 'border-electric text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
              {(value === 'proposal' ? proposalDirty : quoteDirty) && <span className="size-1.5 rounded-full bg-orange-500" />}
            </button>
          ))}
        </div>
        <div className="mb-2 flex gap-2">
          <PdfDownloadButton clientId={client.id} version={view?.no ?? latest} />
          <Button variant="outline" className="rounded-none" onClick={() => setPresent(tab)} title="제안서·견적서를 화면 전체로 띄웁니다">
            <MonitorPlay /> 프레젠테이션
          </Button>
          <Button variant="outline" className="rounded-none" onClick={() => setPrintOpen(true)}>
            <Printer /> 인쇄
          </Button>
        </div>
      </div>

      {view ? (
        <VersionView clientId={client.id} client={client} version={view} tab={tab} onPresent={() => setPresent(tab)} />
      ) : (
        <>
          <div hidden={tab !== 'proposal'}>
            <ProposalPanel
              clientId={client.id}
              initialHtml={proposalHtml}
              onDirty={setProposalDirty}
              locked={locked}
              onContent={(html) => (live.current.proposal = html)}
              onPresent={() => setPresent('proposal')}
            />
          </div>
          <div hidden={tab !== 'quote'}>
            <QuotePanel
              client={client}
              initialQuote={initialQuote}
              onDirty={setQuoteDirty}
              visible={tab === 'quote'}
              locked={locked}
              onContent={(html) => (live.current.quote = html)}
              onPresent={() => setPresent('quote')}
              takeoffTemplates={takeoffTemplates}
            />
          </div>
        </>
      )}

      {present && (
        <PresentOverlay
          title={view ? `${client.name} · v${view.no}` : client.name}
          initial={present}
          docs={
            [
              { key: 'proposal', label: '제안서', html: withBrandFont(view ? view.proposalHtml : live.current.proposal) },
              { key: 'quote', label: '견적서', html: view ? quoteDocument(view.quote, client) : live.current.quote || quoteDocument(initialQuote, client) },
            ].filter((d) => (d.key === 'proposal' ? !!(view ? view.proposalHtml : live.current.proposal) : true)) as PresentDoc[]
          }
          onClose={() => setPresent(null)}
        />
      )}

      {printOpen && (
        <PrintDialog
          clientId={client.id}
          tab={tab}
          version={view?.no ?? latest}
          unsaved={[proposalDirty && '제안서', quoteDirty && '견적서'].filter(Boolean) as string[]}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  )
}

// ---------- 업체 정보 ----------

function ClientHeader({ client, onSaved }: { client: ClientInfo; onSaved: (c: ClientInfo) => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(client)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [portalPassword, setPortalPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const set = (k: keyof ClientInfo) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = () =>
    startTransition(async () => {
      setError('')
      try {
        await saveClientInfo(client.id, form, portalPassword)
        const next = { ...form, portalPasswordSet: form.portalPasswordSet || !!portalPassword }
        setForm(next)
        setPortalPassword('')
        onSaved(next)
        setOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : '저장하지 못했습니다.')
      }
    })

  const copyLink = async () => {
    await navigator.clipboard.writeText(`https://nm-solution.co.kr/${client.portalSlug}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const remove = () => {
    if (!confirm(`'${client.name}' 업체와 제안서·견적서를 모두 지울까요? 되돌릴 수 없습니다.`)) return
    startTransition(async () => {
      await deleteClient(client.id)
      router.push('/admin/clients')
    })
  }

  return (
    <div className="bg-background p-5 ring-1 ring-border lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[client.contactPerson, client.phone, client.email, client.siteAddress].filter(Boolean).join(' · ') || '담당자·연락처 미입력'}
          </p>
          {client.portalSlug && (
            <p className="mt-1 text-sm">
              업체용 링크{' '}
              <a href={`/${client.portalSlug}`} target="_blank" rel="noreferrer" className="font-medium text-electric underline-offset-2 hover:underline">
                nm-solution.co.kr/{client.portalSlug}
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="ml-2 inline-flex items-center gap-1 border border-border px-1.5 py-0.5 align-middle text-xs hover:bg-muted"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? '복사됨' : '링크 복사'}
              </button>
              <span className="text-muted-foreground"> · 비밀번호만 입력해 열람{client.portalPasswordSet ? '' : ' · 비밀번호 미정'}</span>
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-none" onClick={() => setOpen((v) => !v)}>
          <Pencil /> 업체 정보
        </Button>
      </div>
      {open && (
        <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="업체명 *" value={form.name} onChange={set('name')} />
            <Field label="사업자등록번호" value={form.bizNumber} onChange={set('bizNumber')} placeholder="000-00-00000" />
            <Field label="담당자" value={form.contactPerson} onChange={set('contactPerson')} />
            <Field label="연락처" value={form.phone} onChange={set('phone')} />
            <Field label="이메일" value={form.email} onChange={set('email')} />
            <Field label="현장 주소" value={form.siteAddress} onChange={set('siteAddress')} />
            <Field
              label="업체용 링크 주소 (영문)"
              value={form.portalSlug}
              onChange={set('portalSlug')}
              placeholder="sinil"
              hint="nm-solution.co.kr/주소 로 열림. 새 주소는 사이트 반영이 한 번 필요함"
            />
            <Field
              label="업체용 링크 새 비밀번호"
              value={portalPassword}
              onChange={setPortalPassword}
              hint={form.portalPasswordSet ? '업체는 이 비밀번호만 넣고 들어옴. 비워 두면 지금 비밀번호를 그대로 씀' : '업체는 이 비밀번호만 넣고 들어옴. 아직 비밀번호가 없음'}
            />
            <div className="sm:col-span-2">
              <Field label="메모·조사 자료 (내부용, 인쇄 안 됨)" value={form.memo} onChange={set('memo')} multiline rows={8} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-none" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />} 저장
            </Button>
            <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button variant="destructive" className="ml-auto rounded-none" onClick={remove} disabled={pending}>
              <Trash2 /> 업체 삭제
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- 제안서 ----------

const DISABLED_SCRIPT = 'text/nm-disabled'

/** 편집 중에는 제안서 안의 스크립트(확대 보기·탭 등)가 돌지 않게 막는다 */
function disableScripts(html: string) {
  return html.replace(/<script(?![^>]*\btype=)([^>]*)>/gi, `<script type="${DISABLED_SCRIPT}"$1>`)
}
function enableScripts(html: string) {
  return html.split(`<script type="${DISABLED_SCRIPT}"`).join('<script')
}

const EDIT_CSS = `<style data-nm-injected>
[data-nm-sel]{outline:3px solid #e8742a!important;outline-offset:2px}
body{cursor:text}img,video{cursor:pointer}
</style>`

function ProposalPanel({
  clientId,
  initialHtml,
  onDirty,
  locked,
  onContent,
  onPresent,
}: {
  clientId: number
  initialHtml: string
  onDirty: (v: boolean) => void
  locked: boolean
  onContent: (html: string) => void
  onPresent: () => void
}) {
  const router = useRouter()
  const [html, setHtml] = useState(initialHtml)
  useEffect(() => {
    onContent(html)
  }, [html, onContent])
  const [editing, setEditing] = useState(false)
  const [source, setSource] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const frame = useRef<HTMLIFrameElement>(null)
  const selected = useRef<HTMLElement | null>(null)

  const srcDoc = useMemo(() => {
    if (!html) return ''
    const shown = withBrandFont(editing ? disableScripts(html) : html)
    return editing ? shown.replace(/<\/head>/i, `${EDIT_CSS}</head>`) : shown
  }, [html, editing])

  useEffect(() => onDirty(editing), [editing, onDirty])

  const doc = () => frame.current?.contentDocument ?? null

  const onLoad = () => {
    const d = doc()
    if (!d || !editing) return
    d.designMode = 'on'
    d.addEventListener('click', (e) => {
      const t = e.target as HTMLElement
      selected.current?.removeAttribute('data-nm-sel')
      selected.current = null
      if (t.tagName === 'IMG' || t.tagName === 'VIDEO') {
        e.preventDefault()
        t.setAttribute('data-nm-sel', '')
        selected.current = t
      }
    })
    d.addEventListener('input', () => setMessage(''))
  }

  const serialize = () => {
    const d = doc()
    if (!d) return null
    d.designMode = 'off'
    d.querySelectorAll('[data-nm-injected]').forEach((n) => n.remove())
    d.querySelectorAll('[data-nm-sel]').forEach((n) => n.removeAttribute('data-nm-sel'))
    return enableScripts(`<!doctype html>\n${d.documentElement.outerHTML}`)
  }

  const persist = (next: string) =>
    startTransition(async () => {
      try {
        const res = await saveProposal(clientId, next)
        if (!res.ok) return setMessage(res.error)
        setHtml(next)
        setEditing(false)
        setSource(null)
        setMessage(res.version ? `저장했습니다. v${res.version}` : '바뀐 내용이 없어 버전을 늘리지 않았습니다.')
        router.refresh()
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '저장하지 못했습니다.')
      }
    })

  const save = () => {
    const next = serialize()
    if (next) persist(next)
  }

  const cancel = () => {
    if (!confirm('고친 내용을 버릴까요?')) return
    setEditing(false)
    setMessage('')
  }

  const exec = (cmd: string, value?: string) => {
    const d = doc()
    d?.execCommand(cmd, false, value)
    frame.current?.contentWindow?.focus()
  }

  const insertMedia = () => {
    const sel = selected.current
    const url = prompt(
      sel ? '바꿀 이미지·영상 주소를 넣어 주세요.' : '넣을 이미지 또는 영상 주소 (mp4, 유튜브)를 넣어 주세요. 글자 커서 위치에 들어갑니다.',
      sel?.getAttribute('src') ?? '',
    )?.trim()
    if (!url) return
    if (sel && sel.tagName === 'IMG') {
      sel.setAttribute('src', url)
      return
    }
    if (sel && sel.tagName === 'VIDEO') {
      sel.querySelectorAll('source').forEach((s) => s.remove())
      sel.setAttribute('src', url)
      ;(sel as HTMLVideoElement).load()
      return
    }
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/)
    const safe = url.replace(/"/g, '&quot;')
    const media = yt
      ? `<iframe src="https://www.youtube.com/embed/${yt[1]}" style="width:100%;aspect-ratio:16/9;border:0" allowfullscreen></iframe>`
      : /\.(mp4|webm|mov)(\?|$)/i.test(url)
        ? `<video controls preload="metadata" playsinline src="${safe}" style="width:100%;aspect-ratio:16/9;background:#0b1224"></video>`
        : `<img src="${safe}" alt="" style="width:100%">`
    exec('insertHTML', `<figure style="margin:16px 0">${media}</figure>`)
  }

  const removeBlock = () => {
    const d = doc()
    if (!d) return
    const target =
      selected.current?.closest('figure') ??
      selected.current ??
      (d.getSelection()?.anchorNode?.parentElement?.closest('section, .step, figure, table, .table-wrap') as HTMLElement | null)
    if (!target) {
      alert('지울 부분(이미지나 섹션 안의 글자)을 먼저 눌러 주세요.')
      return
    }
    const label = target.tagName === 'SECTION' ? `'${target.querySelector('h2')?.textContent ?? '이'}' 섹션` : '선택한 부분'
    if (!confirm(`${label}을 지울까요? 저장 전에는 취소로 되돌릴 수 있습니다.`)) return
    target.remove()
    selected.current = null
  }

  const regenerate = () => {
    if (!confirm('지금 제안서를 지우고 홈페이지 내용으로 기본 제안서를 다시 만들까요?')) return
    startTransition(async () => {
      const res = await resetProposal(clientId)
      if (!res.ok) return setMessage(res.error)
      setHtml(res.html)
      setEditing(false)
      setMessage(`기본 제안서로 다시 만들었습니다.${res.version ? ` v${res.version}` : ''}`)
      router.refresh()
    })
  }

  if (source !== null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">제안서 HTML 을 직접 고칩니다. 잘 모르면 화면 편집을 쓰세요.</p>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          className="h-[70vh] w-full border border-input bg-background p-3 font-mono text-xs"
        />
        <div className="flex gap-2">
          <Button className="rounded-none" disabled={pending} onClick={() => persist(source)}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />} 저장
          </Button>
          <Button variant="outline" className="rounded-none" onClick={() => setSource(null)}>
            취소
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-secondary py-2">
        {editing ? (
          <>
            <Button className="rounded-none" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />} 저장
            </Button>
            <Button variant="outline" className="rounded-none" onClick={cancel}>
              <X /> 취소
            </Button>
            <span className="mx-1 h-6 w-px bg-border" />
            <Button variant="outline" size="icon" className="rounded-none" title="실행 취소" onClick={() => exec('undo')}>
              <Undo2 />
            </Button>
            <Button variant="outline" size="icon" className="rounded-none" title="굵게" onClick={() => exec('bold')}>
              <Bold />
            </Button>
            <Button variant="outline" className="rounded-none" onClick={insertMedia}>
              <ImagePlus /> 이미지·영상
            </Button>
            <Button variant="outline" className="rounded-none" onClick={removeBlock}>
              <Trash2 /> 부분 삭제
            </Button>
            <span className="text-xs text-muted-foreground">글자는 화면에서 바로 고치세요. 이미지·영상은 눌러서 바꿉니다.</span>
          </>
        ) : locked ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-4" /> 최종본 확정으로 잠김
          </span>
        ) : (
          <>
            <Button className="rounded-none" onClick={() => setEditing(true)} disabled={!html}>
              <Pencil /> 편집
            </Button>
            <Button variant="outline" className="rounded-none" onClick={() => setSource(html)}>
              <Code /> HTML
            </Button>
            <Button variant="ghost" className="rounded-none" onClick={regenerate} disabled={pending}>
              <RotateCcw /> 기본 제안서로
            </Button>
          </>
        )}
        {!editing && html && (
          <Button variant="outline" className="ml-auto rounded-none" onClick={onPresent}>
            <Expand /> 전체화면
          </Button>
        )}
        {message && <span className="text-sm text-electric">{message}</span>}
      </div>
      {html ? (
        <iframe
          ref={frame}
          key={editing ? 'edit' : 'view'}
          srcDoc={srcDoc}
          onLoad={onLoad}
          title="제안서"
          className="h-[80vh] w-full border border-border bg-white"
        />
      ) : (
        <p className="border border-dashed border-border bg-background px-6 py-16 text-center text-sm text-muted-foreground">
          제안서가 비어 있습니다. &lsquo;기본 제안서로&rsquo;를 눌러 만들어 주세요.
        </p>
      )}
    </div>
  )
}

// ---------- 견적서 ----------

function QuotePanel({
  client,
  initialQuote,
  onDirty,
  visible,
  locked,
  onContent,
  onPresent,
  takeoffTemplates,
}: {
  client: ClientInfo
  initialQuote: Quote
  onDirty: (v: boolean) => void
  visible: boolean
  locked: boolean
  onContent: (html: string) => void
  onPresent: () => void
  takeoffTemplates: TakeoffTemplate[]
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuote)
  const [dirty, setDirtyState] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const calc = useMemo(() => calcQuote(q), [q])
  const preview = useMemo(() => quoteDocument(q, client), [q, client])
  useEffect(() => {
    onContent(preview)
  }, [preview, onContent])
  const previewFrame = useRef<HTMLIFrameElement>(null)

  const setDirty = (v: boolean) => {
    setDirtyState(v)
    onDirty(v)
  }

  const update = (patch: Partial<Quote>) => {
    setQ((cur) => ({ ...cur, ...patch }))
    setDirty(true)
    setMessage('')
  }
  const updateSection = (sid: string, patch: Partial<QuoteSection>) =>
    update({ sections: q.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) })
  const updateItem = (sid: string, iid: string, patch: Partial<QuoteItem>) =>
    update({
      sections: q.sections.map((s) =>
        s.id === sid ? { ...s, items: s.items.map((i) => (i.id === iid ? { ...i, ...patch } : i)) } : s,
      ),
    })

  const save = () =>
    startTransition(async () => {
      try {
        const res = await saveQuote(client.id, q)
        if (!res.ok) return setMessage(res.error)
        setDirty(false)
        setMessage(res.version ? `저장했습니다. v${res.version}` : '바뀐 내용이 없어 버전을 늘리지 않았습니다.')
        router.refresh()
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '저장하지 못했습니다.')
      }
    })

  // 미리보기 높이를 내용에 맞춘다
  const fitPreview = () => {
    const f = previewFrame.current
    const d = f?.contentDocument
    if (f && d && d.documentElement.scrollHeight) f.style.height = `${d.documentElement.scrollHeight + 4}px`
  }
  // 숨겨진 탭에서 읽히면 높이가 0 이므로 탭이 보일 때 다시 맞춘다
  useEffect(() => {
    if (visible) fitPreview()
  }, [visible])

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-secondary py-2">
        {locked ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-4" /> 최종본 확정으로 잠김
          </span>
        ) : (
          <Button className="rounded-none" onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />} 저장
          </Button>
        )}
        <div className="text-sm tabular-nums">
          {calc.discount > 0 && <>공정 합계 {won(calc.works)} · 할인 -{won(calc.discount)} · </>}
          공급가액 <b>{won(calc.supply)}</b> · 부가세 {won(calc.vat)} · 합계 <b className="text-electric">{won(calc.grand)}원</b>
          {calc.options > 0 && <> · 선택 항목 별도 {won(calc.options)}</>}
          {calc.deduct > 0 && <> · 감액 시 공급가액 {won(calc.lessSupply)} (-{won(calc.deduct)})</>}
        </div>
        {message && <span className="text-sm text-electric">{message}</span>}
      </div>

      {/* 확정되면 입력칸·버튼을 모두 막는다 */}
      <fieldset disabled={locked} className="flex min-w-0 flex-col gap-5">
        <section className="grid gap-4 bg-background p-5 ring-1 ring-border sm:grid-cols-3">
          <Field label="견적번호" value={q.number} onChange={(v) => update({ number: v })} />
          <label className="flex flex-col gap-2 text-sm font-medium">
            견적일자
            <input
              type="date"
              value={q.date}
              onChange={(e) => update({ date: e.target.value })}
              className="h-9 border border-input bg-background px-2 text-sm"
            />
          </label>
          <Field label="유효기간 (일)" value={String(q.validDays)} onChange={(v) => update({ validDays: Number(v.replace(/\D/g, '')) || 30 })} />
          <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-3">
            견적서 수신란
            <select
              value={q.recipientFields ?? 'contact'}
              onChange={(e) => update({ recipientFields: e.target.value === 'biz' ? 'biz' : 'contact' })}
              className="h-9 border border-input bg-background px-2 text-sm"
            >
              <option value="biz">업체명 · 사업자번호 · 현장</option>
              <option value="contact">업체명 · 담당자 · 연락처 · 현장</option>
            </select>
          </label>
          <div className="sm:col-span-3">
            <Field label="공사명" value={q.title} onChange={(v) => update({ title: v })} />
          </div>
        </section>

        <TakeoffPanel
          value={q.takeoff}
          sections={q.sections}
          templates={takeoffTemplates}
          title={q.title}
          onChange={(takeoff) => update({ takeoff })}
          onApply={(sections) => update({ sections })}
        />

        {q.sections.map((s, si) => {
          const c = calc.sections[si]
          return (
            <section key={s.id} className="bg-background ring-1 ring-border">
              <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
                <span className="font-mono text-xs text-muted-foreground">공종 {si + 1}</span>
                <TextIn value={s.name} onChange={(v) => updateSection(s.id, { name: v })} placeholder="공종명 (예: 배관·설비)" className="max-w-56 font-semibold" />
                <TextIn value={s.desc} onChange={(v) => updateSection(s.id, { desc: v })} placeholder="한 줄 설명 (선택)" className="min-w-40 flex-1" />
                <span className="ml-auto text-sm font-semibold tabular-nums">{won(c.total)}원</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="공종 삭제"
                  onClick={() => confirm(`'${s.name || '공종'}'을 지울까요?`) && update({ sections: q.sections.filter((x) => x.id !== s.id) })}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-secondary text-xs text-muted-foreground">
                    <tr>
                      <th className="w-24 px-2 py-2 text-left font-medium">구분</th>
                      <th className="px-2 py-2 text-left font-medium">품명</th>
                      <th className="px-2 py-2 text-left font-medium">규격</th>
                      <th className="w-20 px-2 py-2 text-right font-medium">수량</th>
                      <th className="w-16 px-2 py-2 text-left font-medium">단위</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">단가</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">금액</th>
                      <th className="px-2 py-2 text-left font-medium">비고</th>
                      <th className="w-12 px-1 py-2 text-center font-medium" title="견적금액에 넣되, 필요 없으면 빼는 줄 (견적서 끝 감액 표)">감액</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="px-1 py-1">
                          <select
                            value={i.kind}
                            onChange={(e) => updateItem(s.id, i.id, { kind: e.target.value as ItemKind })}
                            className="h-8 w-full border border-input bg-background px-1 text-sm"
                          >
                            {ITEM_KINDS.map((k) => (
                              <option key={k}>{k}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1"><TextIn value={i.name} onChange={(v) => updateItem(s.id, i.id, { name: v })} /></td>
                        <td className="px-1 py-1"><TextIn value={i.spec} onChange={(v) => updateItem(s.id, i.id, { spec: v })} /></td>
                        <td className="px-1 py-1"><NumInput value={i.qty} onChange={(n) => updateItem(s.id, i.id, { qty: n })} /></td>
                        <td className="px-1 py-1"><TextIn value={i.unit} onChange={(v) => updateItem(s.id, i.id, { unit: v })} /></td>
                        <td className="px-1 py-1"><NumInput value={i.price} onChange={(n) => updateItem(s.id, i.id, { price: n })} /></td>
                        <td className="px-2 py-1 text-right tabular-nums">{won(itemAmount(i))}</td>
                        <td className="px-1 py-1"><TextIn value={i.note} onChange={(v) => updateItem(s.id, i.id, { note: v })} /></td>
                        <td className="px-1 py-1 text-center">
                          <input type="checkbox" checked={!!i.deduct} onChange={(e) => updateItem(s.id, i.id, { deduct: e.target.checked })} />
                        </td>
                        <td className="px-1 py-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="줄 삭제"
                            onClick={() => updateSection(s.id, { items: s.items.filter((x) => x.id !== i.id) })}
                          >
                            <X />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border p-3 text-xs text-muted-foreground">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none"
                  onClick={() => updateSection(s.id, { items: [...s.items, emptyItem(s.items.at(-1)?.kind)] })}
                >
                  <Plus /> 줄 추가
                </Button>
                <span className="tabular-nums">재료비 {won(c.mat)} · 노무비 {won(c.lab)} · 경비 {won(c.exp)}</span>
                {q.costCalc && !s.flat && (
                  <span className="tabular-nums">
                    보험·안전 {won(c.injury + c.employment + c.safety)} · 일반관리비 {won(c.overhead)} · 이윤 {won(c.profit)}
                  </span>
                )}
                {q.costCalc && (
                  <label className="ml-auto flex items-center gap-1.5">
                    원가계산
                    <select
                      value={sectionMode(s)}
                      onChange={(e) => updateSection(s.id, modeFields(e.target.value as SectionCalcMode))}
                      className="h-7 border border-input bg-background px-1 text-xs text-foreground"
                    >
                      <option value="full">전부 적용</option>
                      <option value="margin">일반관리비·이윤만</option>
                      <option value="overhead">일반관리비만</option>
                      <option value="none">제외 (재료·노무·경비만)</option>
                    </select>
                  </label>
                )}
                <label className={`flex items-center gap-1.5${q.costCalc ? '' : ' ml-auto'}`}>
                  <input type="checkbox" checked={!!s.option} onChange={(e) => updateSection(s.id, { option: e.target.checked })} />
                  선택 항목 (견적금액 별도)
                </label>
              </div>
            </section>
          )
        })}

        <div>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => update({ sections: [...q.sections, { id: newId('s'), name: '', desc: '', items: [emptyItem()] }] })}
          >
            <Plus /> 공종 추가
          </Button>
        </div>

        <section className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={q.costCalc} onChange={(e) => update({ costCalc: e.target.checked })} />
            원가계산 적용 (공종마다 산재·고용보험료, 산업안전보건관리비, 일반관리비, 이윤을 붙임)
          </label>
          {q.costCalc && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  ['injury', '산재보험료 %'],
                  ['employment', '고용보험료 %'],
                  ['safety', '안전관리비 %'],
                  ['overhead', '일반관리비 %'],
                  ['profit', '이윤 %'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {label}
                  <NumInput value={q.rates[k]} onChange={(n) => update({ rates: { ...q.rates, [k]: n } })} />
                </label>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={q.truncate} onChange={(e) => update({ truncate: e.target.checked })} />
            공종 합계 천원 미만 절사
          </label>
          <DiscountEditor q={q} works={calc.works} update={update} />
          <Field
            label="특기사항 (한 줄에 한 항목)"
            multiline
            rows={6}
            value={q.notes}
            onChange={(v) => update({ notes: v })}
            hint="공사 기간, 결제 조건, 포함·제외 사항. 견적 유효기간 줄은 자동으로 붙습니다."
          />
        </section>

      </fieldset>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">미리보기 (인쇄되는 모양)</h2>
          <Button variant="outline" size="sm" className="rounded-none" onClick={onPresent}>
            <Expand /> 전체화면
          </Button>
        </div>
        <iframe ref={previewFrame} srcDoc={preview} onLoad={fitPreview} title="견적서 미리보기" className="h-[1200px] w-full border border-border" />
      </div>
    </div>
  )
}

// ---------- PDF 다운로드 ----------

/** 제안서 + 견적서를 서버에서 PDF 로 만들어 바로 내려받는다 (인쇄 창 없이). 저장된 내용 기준 */
function PdfDownloadButton({ clientId, version }: { clientId: number; version: number }) {
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/pdf?docs=both${version ? `&version=${version}` : ''}`)
      if (!res.ok) throw new Error(await res.text())
      const name = decodeURIComponent(res.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? 'proposal.pdf')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e) {
      alert(`PDF를 만들지 못했습니다. ${e instanceof Error ? e.message : ''}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="outline" className="rounded-none" onClick={download} disabled={busy} title="제안서 + 견적서를 PDF 파일로 바로 내려받습니다 (저장된 내용 기준)">
      {busy ? <Loader2 className="animate-spin" /> : <FileDown />} {busy ? 'PDF 만드는 중…' : 'PDF 다운로드'}
    </Button>
  )
}

// ---------- 인쇄 ----------

function PrintDialog({
  clientId,
  tab,
  version,
  unsaved,
  onClose,
}: {
  clientId: number
  tab: Tab
  /** 인쇄할 버전 (최신본이면 최신 번호) */
  version: number
  unsaved: string[]
  onClose: () => void
}) {
  const [docs, setDocs] = useState<PrintDocs>('both')
  const options: { value: PrintDocs; label: string; hint: string }[] = [
    { value: 'both', label: '제안서 + 견적서 함께', hint: '제안서 뒤에 견적서를 새 쪽으로 붙여 인쇄' },
    { value: tab, label: tab === 'proposal' ? '제안서만' : '견적서만', hint: '지금 보고 있는 문서만' },
    {
      value: tab === 'proposal' ? 'quote' : 'proposal',
      label: tab === 'proposal' ? '견적서만' : '제안서만',
      hint: '다른 탭 문서만',
    },
    { value: 'book', label: '제본용 (양면 · 펼침면)', hint: '표지·목차, 소제목마다 펼친 두 쪽, 견적서는 왼쪽 쪽부터. 양면·여백 없음·배경 그래픽 켜고 인쇄' },
  ]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const print = () => {
    window.open(`/api/admin/clients/${clientId}/print?docs=${docs}${version ? `&version=${version}` : ''}`, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="인쇄"
        className="w-full max-w-md bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">제안서와 견적서를 함께 인쇄할까요?</h2>
        {version > 0 && <p className="mt-1 text-sm text-muted-foreground">v{version} 을 인쇄합니다. 인쇄 창에서 &lsquo;PDF로 저장&rsquo;을 고르면 PDF 가 됩니다.</p>}
        <div className="mt-4 flex flex-col gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 border px-4 py-3',
                docs === o.value ? 'border-electric bg-electric/5' : 'border-border',
              )}
            >
              <input type="radio" name="docs" className="mt-1" checked={docs === o.value} onChange={() => setDocs(o.value)} />
              <span>
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {unsaved.length > 0 && (
          <p className="mt-3 text-sm text-orange-600">{unsaved.join('·')}에 저장하지 않은 변경이 있습니다. 인쇄에는 저장된 내용만 들어갑니다.</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-none" onClick={onClose}>
            취소
          </Button>
          <Button className="rounded-none" onClick={print}>
            <Printer /> 인쇄
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 할인(NEGO): 금액을 직접 넣거나, 부가세 포함 최종 금액을 넣으면 할인 금액을 계산해 채운다 */
function DiscountEditor({ q, works, update }: { q: Quote; works: number; update: (p: Partial<Quote>) => void }) {
  const [target, setTarget] = useState(0)
  const [msg, setMsg] = useState('')
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <p className="text-sm font-medium">할인 (공정 합계 {won(works)}원에서 빼고, 부가세는 할인 뒤 금액에 붙음)</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          할인 이름
          <TextIn value={q.discountLabel} onChange={(v) => update({ discountLabel: v })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          할인 금액 (부가세 별도)
          <NumInput value={q.discount} onChange={(n) => update({ discount: Math.max(0, Math.round(n)) })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          최종 금액(부가세 포함)으로 맞추기
          <span className="flex gap-1">
            <NumInput value={target} onChange={setTarget} />
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              onClick={() => {
                const d = discountForGrand(q, target)
                if (d == null) return setMsg('공정 합계보다 큰 금액은 맞출 수 없습니다.')
                setMsg('')
                update({ discount: d })
              }}
            >
              맞추기
            </Button>
          </span>
        </label>
      </div>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
    </div>
  )
}
